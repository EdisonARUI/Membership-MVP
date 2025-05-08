import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { AppStorage } from './storage';
import { SuiService } from './sui';
import { 
  PartialZkLoginSignature, 
  ZkProofRequestBody,
  ZkLoginProcessResult 
} from '../interfaces/ZkLogin';
import { parseJwt } from '@/utils/jwt/client';
import { API_ENDPOINTS } from '../app/api/endpoints';
import { api } from '../app/api/clients';
import { AppError } from '../interfaces/Error';

// 日志回调函数类型
type LogCallback = (message: string) => void;

export class ZkLoginService {
  // 静态日志回调
  private static logCallback: LogCallback | null = null;
  
  /**
   * 设置日志回调函数
   * @param callback 日志回调函数
   */
  static setLogCallback(callback: LogCallback): void {
    this.logCallback = callback;
  }
  
  /**
   * 输出日志
   * @param message 日志消息
   */
  private static log(message: string): void {
    // 如果设置了回调，调用回调
    if (this.logCallback) {
      this.logCallback(message);
    }
  }

  /**
   * 解析JWT令牌
   * @param jwt JWT令牌
   * @returns 解析后的JWT载荷
   */
  static parseJwt(jwt: string): any {
    try {
      return parseJwt(jwt);
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
  static async initialize(forceNew: boolean = false): Promise<{ keypair: any, nonce: string }> {
    try {
      this.log("开始创建临时密钥对...");
      
      if (!SuiService) {
        this.log("SuiService未定义");
        throw new Error("SuiService未定义");
      }
      
      if (!SuiService.createEphemeralKeyPair) {
        this.log("SuiService.createEphemeralKeyPair方法未定义");
        throw new Error("createEphemeralKeyPair方法未定义");
      }
      
      const keypair = await SuiService.createEphemeralKeyPair()
        .catch(error => {
          this.log(`SuiService.createEphemeralKeyPair执行失败: ${error.message}`);
          throw new Error(`创建密钥对失败: ${error.message || '未知错误'}`);
        });
      
      if (!keypair || !keypair.nonce) {
        this.log("创建的临时密钥对无效");
        throw new Error("创建的临时密钥对无效");
      }
      
      this.log(`临时密钥对创建成功, nonce: ${keypair.nonce}`);
      
      return {
        keypair,
        nonce: keypair.nonce
      };
    } catch (error: any) {
      this.log(`准备密钥对失败: ${error.message || '未知错误'}`);
      throw error instanceof Error ? error : new Error(`准备密钥对失败: ${error?.message || '未知错误'}`);
    }
  }

  /**
   * 获取用户盐值
   */
  static async fetchUserSalt(jwt: string, keyClaimName: string = 'sub'): Promise<string> {
    try {
      this.log("开始获取用户盐值...");
      const response = await api.post<{ salt: string }>(
        API_ENDPOINTS.ZKLOGIN.USER.SALT,
        { jwt, keyClaimName }
      );
      
      if (!response.success || !response.data?.salt) {
        this.log("获取盐值失败");
        
        // 检查是否有错误详情中包含响应文本
        let errorMessage = response.error?.message || '获取用户盐值失败';
        if (response.error?.details?.responseText) {
          this.log(`错误响应内容: ${response.error.details.contentType || '未知'}`);
          errorMessage += ` - 非预期的响应格式: ${response.error.details.contentType || '未知'}`;
        }
        
        throw AppError.fromApiError(response.error || {
          status: 500,
          code: 'SALT_ERROR',
          message: errorMessage
        });
      }
      
      this.log(`获取用户盐值成功: ${response.data.salt.substring(0, 10)}...`);
      return response.data.salt;
    } catch (error: any) {
      this.log(`获取盐值请求失败: ${error.message || '未知错误'}`);
      throw error; // 让上层处理这个错误
    }
  }

  /**
   * 获取ZKP（零知识证明）
   */
  static async getZkProof(
    jwt: string,
    ephemeralKeypair: Ed25519Keypair,
    userSalt: string,
    jwtRandomness: string,
    maxEpoch: number,
    networkType: 'mainnet' | 'testnet' | 'devnet' = 'devnet'
  ): Promise<PartialZkLoginSignature> {
    try {
      this.log("开始获取ZKP（零知识证明）...");
      const ephemeralPublicKey = ephemeralKeypair.getPublicKey().toBase64();
            
      const requestBody: ZkProofRequestBody = {
        jwt,
        ephemeralPublicKey,
        userSalt,
        networkType,
        jwtRandomness,
        maxEpoch
      };
      
      // 使用集中化的API定义和请求工具
      const response = await api.post<{ proof: PartialZkLoginSignature }>(
        API_ENDPOINTS.ZKLOGIN.PROOF, 
        requestBody
      );
      
      if (!response.success || !response.data?.proof) {
        this.log("获取ZKP失败");
        
        // 检查是否有错误详情中包含响应文本
        let errorMessage = response.error?.message || '获取ZKP失败';
        if (response.error?.details?.responseText) {
          this.log(`错误响应内容: ${response.error.details.contentType || '未知'}`);
          errorMessage += ` - 非预期的响应格式: ${response.error.details.contentType || '未知'}`;
        }
        
        throw AppError.fromApiError(response.error || {
          status: 500,
          code: 'ZKP_ERROR',
          message: errorMessage
        });
      }
      
      this.log("获取ZKP成功");
      return response.data.proof;
    } catch (error: any) {
      this.log(`获取ZKP请求失败: ${error.message || '未知错误'}`);
      throw error; // 让上层处理这个错误
    }
  }

  /**
   * 激活地址
   */
  static async activateAddress(address: string): Promise<void> {
    try {
      this.log(`开始激活地址: ${address}`);
      await SuiService.activateAddress(address);
      this.log(`地址激活请求已发送: ${address}`);
    } catch (error: any) {
      this.log(`尝试激活地址失败: ${error.message || '未知错误'}`);
      // 继续执行不中断流程
    }
  }

  /**
   * 检查并获取临时密钥对
   * @private
   */
  private static checkAndGetEphemeralKeyPair(): Ed25519Keypair {
    const ephemeralKeypair = AppStorage.getEphemeralKeypair()?.keypair;
      if (!ephemeralKeypair) {
      this.log("找不到临时密钥对，无法处理JWT");
        throw new Error("找不到临时密钥对，无法处理JWT");
      }
      
      // 重建密钥对
    return SuiService.recreateKeypairFromStored(ephemeralKeypair);
  }

  /**
   * 解析并存储JWT
   * @private
   */
  private static parseAndStoreJwt(jwt: string): any {
      const payload = this.parseJwt(jwt);
    this.log(`JWT解析成功: sub=${payload.sub}, iss=${payload.iss}`);
      
      // 存储解析后的JWT
      AppStorage.setDecodedJwt(payload);
    return payload;
  }

  /**
   * 获取或获取用户盐值
   * @private
   */
  private static async getOrFetchUserSalt(jwt: string): Promise<string> {
      let userSalt = AppStorage.getZkLoginUserSalt();
      if (!userSalt) {
        try {
        this.log("本地未找到盐值，从API获取...");
          userSalt = await this.fetchUserSalt(jwt);
          AppStorage.setZkLoginUserSalt(userSalt);
        this.log(`获取用户盐值成功: ${userSalt.substring(0, 10)}...`);
        } catch (saltError: any) {
        this.log(`获取盐值时发生错误: ${saltError.message || '未知错误'}`);
          
          // 尝试记录响应内容
          if (saltError.responseText) {
          this.log("错误响应内容可用，记录详情");
          }
          
          throw new Error(`获取用户盐值失败: ${saltError.message}`);
        }
    } else {
      this.log("使用本地存储的盐值");
      }
      
    return userSalt;
  }
      
  /**
   * 获取并处理JWT随机性和最大纪元
   * @private
   */
  private static getJwtParams(): { jwtRandomness: string, maxEpoch: number } {
      const jwtRandomness = AppStorage.getZkLoginOriginalRandomness()
        ? JSON.parse(AppStorage.getZkLoginOriginalRandomness()!)
        : '';
        
      // 获取 maxEpoch
      const maxEpoch = parseInt(AppStorage.getZkLoginOriginalMaxEpoch() || '2');
    this.log(`使用maxEpoch: ${maxEpoch}`);

    return { jwtRandomness, maxEpoch };
  }

  /**
   * 获取并存储ZKP证明
   * @private
   */
  private static async getAndStoreProof(
    jwt: string, 
    keypair: Ed25519Keypair, 
    userSalt: string,
    jwtRandomness: string,
    maxEpoch: number
  ): Promise<PartialZkLoginSignature> {
    try {
      this.log("开始获取零知识证明...");
      const proofResponse = await this.getZkProof(
        jwt, 
        keypair, 
        userSalt, 
        jwtRandomness, 
        maxEpoch
      );
        
        // 存储结果
        AppStorage.setZkLoginPartialSignature(proofResponse);
      return proofResponse;
      } catch (proofError: any) {
      this.log(`获取ZKP证明时发生错误: ${proofError.message || '未知错误'}`);
        
        // 尝试记录响应内容
        if (proofError.responseText) {
        this.log("错误响应内容可用，记录详情");
        }
        
        throw new Error(`获取ZKP证明失败: ${proofError.message}`);
      }
  }

  /**
   * 处理 JWT 并完成 zkLogin 流程
   * @param jwt JWT 令牌
   * @returns 处理结果
   */
  static async processJwt(jwt: string): Promise<ZkLoginProcessResult> {
    try {
      this.log("开始处理JWT...");
      
      // 1. 检查并获取临时密钥对
      const keypair = this.checkAndGetEphemeralKeyPair();
      
      // 2. 解析JWT
      const payload = this.parseAndStoreJwt(jwt);
      
      // 3. 获取用户盐值
      const userSalt = await this.getOrFetchUserSalt(jwt);
      
      // 4. 计算zkLogin地址
      this.log("开始计算zkLogin地址...");
      const zkLoginAddress = await SuiService.deriveZkLoginAddress(jwt, userSalt);
      this.log(`zkLogin地址计算成功: ${zkLoginAddress}`);
      
      // 5. 获取JWT随机性和最大纪元
      const { jwtRandomness, maxEpoch } = this.getJwtParams();
      
      // 6. 获取并存储ZKP
      const partialSignature = await this.getAndStoreProof(
        jwt, 
        keypair, 
        userSalt, 
        jwtRandomness, 
        maxEpoch
      );
      
      // 7. 保存地址和标记处理状态
      AppStorage.setZkLoginAddress(zkLoginAddress);
      AppStorage.setJwtProcessed(true);
      
      // 8. 激活地址
      await this.activateAddress(zkLoginAddress);
      
      this.log("JWT处理完成，返回结果");
      return {
        zkLoginAddress,
        partialSignature,
        ephemeralKeypair: keypair
      };
    } catch (error: any) {
      this.log(`处理JWT失败: ${error.message || '未知错误'}`);
      throw new Error(`JWT处理失败: ${error.message}`);
    }
  }
} 