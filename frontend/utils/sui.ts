import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { generateNonce, generateRandomness, jwtToAddress, getExtendedEphemeralPublicKey } from '@mysten/sui/zklogin';
import { EphemeralKeyPair } from '@/components/zklogin/types';
import { toB64 } from '@mysten/sui/utils';
import { API_ENDPOINTS } from '../app/api/endpoints';
import { api } from '../app/api/clients';
import { AppError } from '../interfaces/Error';

// Sui Devnet客户端
const FULLNODE_URL = 'https://fullnode.devnet.sui.io';
export const suiClient = new SuiClient({ url: FULLNODE_URL });

// 最大Epoch增量
const MAX_EPOCH_INCREMENT = 2;

export const SuiService = {
  // 创建临时密钥对
  async createEphemeralKeyPair(): Promise<EphemeralKeyPair> {
    try {
      // 获取当前Epoch
      const epochState = await suiClient.getLatestSuiSystemState().catch(error => {
        console.error('获取Sui系统状态失败:', error);
        throw new Error(`获取当前Epoch失败: ${error.message || '网络错误'}`);
      });
      
      if (!epochState || !epochState.epoch) {
        console.error('获取Sui系统状态返回无效:', epochState);
        throw new Error('无法获取有效的Epoch信息');
      }
      
      const currentEpoch = Number(epochState.epoch);
      console.log('当前Epoch:', currentEpoch);
      const maxEpoch = currentEpoch + MAX_EPOCH_INCREMENT;
      
      try {
        // 创建密钥对和随机数
        const keypair = new Ed25519Keypair();
        const randomness = generateRandomness();
        const nonce = generateNonce(keypair.getPublicKey(), maxEpoch, randomness);
        
        // 验证生成的密钥对
        try {
          const address = keypair.getPublicKey().toSuiAddress();
          console.log('生成的密钥对临时地址:', address);
        } catch (verifyError) {
          console.warn('验证密钥对时出现警告:', verifyError);
          // 继续执行，不中断流程
        }
        
        return {
          keypair: {
            publicKey: toB64(keypair.getPublicKey().toRawBytes()),
            secretKey: keypair.getSecretKey()
          },
          randomness,
          maxEpoch,
          nonce
        };
      } catch (keypairError: any) {
        console.error('创建密钥对时出错:', keypairError);
        throw new Error(`生成密钥对失败: ${keypairError.message || '未知错误'}`);
      }
    } catch (error: any) {
      console.error('createEphemeralKeyPair完整错误:', error);
      throw error; // 保留原始错误
    }
  },

  // 获取扩展公钥
  getExtendedPublicKey(keypair: Ed25519Keypair): string {
    return getExtendedEphemeralPublicKey(keypair.getPublicKey());
  },

  // 获取扩展公钥（从存储的keypair对象）
  getExtendedPublicKeyFromStored(storedKeypair: any): string {
    try {
      // 如果传入的是完整Ed25519Keypair实例
      if (typeof storedKeypair.getPublicKey === 'function') {
        return getExtendedEphemeralPublicKey(storedKeypair.getPublicKey());
      }
      
      // 如果传入的是存储格式的keypair对象
      if (storedKeypair.publicKey) {
        return getExtendedEphemeralPublicKey(storedKeypair.publicKey);
      }
      
      throw new Error('无效的密钥对格式');
    } catch (error) {
      console.error('获取扩展公钥错误:', error);
      throw error;
    }
  },

  // 从存储的密钥对重新创建实际的Ed25519Keypair实例
  recreateKeypairFromStored(storedKeypair: any): Ed25519Keypair {
    console.log("开始重建密钥对，传入的storedKeypair:", {
      ...storedKeypair,
      secretKey: storedKeypair.secretKey ? '*** 隐藏 ***' : '未提供'
    });
    
    if (!storedKeypair.secretKey) {
      throw new Error('无效的密钥对格式：缺少secretKey字段');
    }
    
    try {
      // 参考zklogin.tsx中的实现，直接从secretKey重建密钥对
      // 这种方法更简洁，因为Ed25519密钥对的公钥可以从私钥派生
      const keypair = Ed25519Keypair.fromSecretKey(storedKeypair.secretKey);
      console.log("密钥对重建成功，地址:", keypair.getPublicKey().toSuiAddress());
      return keypair;
    } catch (error: any) {
      console.error('重新创建密钥对失败:', error);
      throw new Error(`重新创建密钥对失败: ${error.message}`);
    }
  },

  // 从JWT计算zkLogin地址
  deriveZkLoginAddress(jwt: string, userSalt: string): string {
    return jwtToAddress(jwt, userSalt);
  },

  // 激活zkLogin地址
  async activateAddress(address: string): Promise<boolean> {
    try {
      const response = await api.post(
        API_ENDPOINTS.SUI.FAUCET,
        { FixedAmountRequest: { recipient: address } }
      );
      
      if (!response.success) {
        console.error('激活地址失败:', response.error);
        return false;
      }
      
      return true;
    } catch (error) {
      if (error instanceof AppError) {
        console.error('激活地址失败:', error.message);
      } else {
        console.error('激活地址失败:', error);
      }
      return false;
    }
  },

  // 获取当前Epoch
  async getCurrentEpoch(): Promise<number> {
    const { epoch } = await suiClient.getLatestSuiSystemState();
    return Number(epoch);
  },

  // 验证地址是否已激活
  async isAddressActive(address: string): Promise<boolean> {
    try {
      const objects = await suiClient.getOwnedObjects({ owner: address });
      return objects.data.length > 0;
    } catch (error) {
      console.error('检查地址状态失败:', error);
      return false;
    }
  }
}; 