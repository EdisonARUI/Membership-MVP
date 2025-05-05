import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { ZkLoginStorage } from './storage';
import { SuiService } from './sui';
import { 
  PartialZkLoginSignature, 
  ZkProofRequestBody,
  ZkLoginProcessResult 
} from '../interfaces/ZkLogin';
import { EphemeralKeyPair } from '@/components/zklogin/types';
import { getExtendedEphemeralPublicKey } from '@mysten/sui/zklogin';

export class ZkLoginService {
  /**
   * 解析JWT令牌
   * @param jwt JWT令牌
   * @returns 解析后的JWT载荷
   */
  static parseJwt(jwt: string): any {
    try {
      const parts = jwt.split('.');
      if (parts.length !== 3) {
        throw new Error("无效的JWT格式");
      }

      const base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64Payload));

      if (!payload.sub || !payload.aud || !payload.iss) {
        throw new Error("JWT缺少必要的字段");
      }

      return payload;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 初始化 zkLogin 流程
   * 创建临时密钥对并保存
   * @param forceNew 是否强制创建新密钥对
   * @returns 创建的临时密钥对和 nonce
   */
  static async initialize(forceNew: boolean = false): Promise<{ keypair: EphemeralKeyPair, nonce: string }> {
    // 如果已有临时密钥对且不强制创建新的
    const existingKeypair = ZkLoginStorage.getEphemeralKeypair();
    if (existingKeypair && !forceNew) {
      console.log("使用现有临时密钥对，不需要重新创建");
      return { 
        keypair: existingKeypair,
        nonce: existingKeypair.nonce
      };
    }

    try {
      console.log("开始创建临时密钥对...");
      const keypair = await SuiService.createEphemeralKeyPair();
      ZkLoginStorage.setEphemeralKeypair(keypair);
      console.log("临时密钥对创建成功");
      
      return {
        keypair,
        nonce: keypair.nonce
      };
    } catch (error: any) {
      console.error(`准备密钥对失败: ${error.message}`);
      throw new Error(`准备密钥对失败: ${error.message}`);
    }
  }

  /**
   * 保存并激活 zkLogin 地址
   * @param address zkLogin 地址
   */
  static async saveAndActivateAddress(address: string): Promise<void> {
    try {
      // 保存地址
      ZkLoginStorage.setZkLoginAddress(address);
      console.log(`zkLogin地址已保存: ${address}`);
      
      // 调用地址激活 API
      const response = await fetch('/api/zkLogin/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`激活地址API请求失败: ${errorData.error || response.statusText}`);
      }
      
      console.log("zkLogin地址激活请求已发送");
    } catch (error: any) {
      console.error(`处理zkLogin地址时出错: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取ZKP（零知识证明）
   * 通过后端API代理请求，避免CORS问题
   */
  static async getZkProof(
    jwt: string,
    ephemeralKeypair: Ed25519Keypair,
    userSalt: string,
    networkType: 'mainnet' | 'testnet' | 'devnet' = 'devnet'
  ): Promise<PartialZkLoginSignature> {
    try {
      // 准备请求数据
      const ephemeralPublicKey = ephemeralKeypair.getPublicKey().toBase64();
      
      const requestBody: ZkProofRequestBody = {
        jwt,
        ephemeralPublicKey,
        userSalt,
        networkType
      };
      
      // 调用后端API
      const response = await fetch('/api/zkLogin/proofs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`获取ZKP失败: ${errorData.error || response.statusText}`);
      }
      
      // 解析响应
      const responseData = await response.json();
      
      // 检查响应是否成功
      if (!responseData.success || !responseData.proof) {
        throw new Error(`获取ZKP失败: ${responseData.error || '未知错误'}`);
      }
      
      return responseData.proof;
    } catch (error: any) {
      console.error('获取ZKP过程中出错:', error);
      throw new Error(`获取ZKP失败: ${error.message}`);
    }
  }
  
  /**
   * 获取用户盐值
   * @param jwt JWT令牌
   * @param keyClaimName JWT中的键名称，默认为'sub'
   * @returns 用户盐值
   */
  static async fetchUserSalt(jwt: string, keyClaimName: string = 'sub'): Promise<string> {
    try {
      // 调用盐值API
      const response = await fetch('/api/zkLogin/salt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jwt, keyClaimName })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`获取用户盐值失败: ${errorData.error || response.statusText}`);
      }
      
      // 解析响应
      const responseData = await response.json();
      
      // 检查响应是否成功
      if (!responseData.success || !responseData.salt) {
        throw new Error(`获取用户盐值失败: ${responseData.error || '未知错误'}`);
      }
      
      return responseData.salt;
    } catch (error: any) {
      console.error('获取用户盐值过程中出错:', error);
      throw new Error(`获取用户盐值失败: ${error.message}`);
    }
  }

  /**
   * 处理 JWT 并完成 zkLogin 流程
   * @param jwt JWT 令牌
   * @returns 处理结果
   */
  static async processJwt(jwt: string): Promise<ZkLoginProcessResult> {
    try {
      // 1. 检查是否有有效的临时密钥对
      let ephemeralKeypair = ZkLoginStorage.getEphemeralKeypair()?.keypair;
      if (!ephemeralKeypair) {
        const { keypair } = await this.initialize(true);
        ephemeralKeypair = keypair.keypair;
      }
      
      // 重建密钥对
      const keypair = SuiService.recreateKeypairFromStored(ephemeralKeypair);
      
      // 2. 解析JWT
      const payload = this.parseJwt(jwt);
      console.log(`JWT解析成功: sub=${payload.sub}, iss=${payload.iss}`);
      ZkLoginStorage.setDecodedJwt(payload);
      
      // 3. 获取用户盐值 - 使用新方法
      let userSalt = localStorage.getItem('zkLogin_userSalt');
      if (!userSalt) {
        // 从API获取用户盐值
        userSalt = await this.fetchUserSalt(jwt);
        localStorage.setItem('zkLogin_userSalt', userSalt);
        console.log(`获取用户盐值成功: ${userSalt.substring(0, 10)}...`);
      }
      
      // 4. 计算zkLogin地址
      const zkLoginAddress = await SuiService.deriveZkLoginAddress(jwt, userSalt);
      
      // 5. 获取ZKP
      const proofResponse = await this.getZkProof(jwt, keypair, userSalt);
      
      // 6. 保存地址
      ZkLoginStorage.setZkLoginAddress(zkLoginAddress);
      ZkLoginStorage.setJwtProcessed(true);
      
      return {
        zkLoginAddress,
        partialSignature: proofResponse,
        ephemeralKeypair: keypair
      };
    } catch (error: any) {
      console.error('处理JWT失败:', error);
      throw new Error(`JWT处理失败: ${error.message}`);
    }
  }
} 