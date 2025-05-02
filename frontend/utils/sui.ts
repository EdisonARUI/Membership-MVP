import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { generateNonce, generateRandomness, jwtToAddress, getExtendedEphemeralPublicKey } from '@mysten/sui/zklogin';
import { EphemeralKeyPair } from '@/components/zklogin/types';
import { toB64 } from '@mysten/sui/utils';

// Sui Devnet客户端
const FULLNODE_URL = 'https://fullnode.devnet.sui.io';
export const suiClient = new SuiClient({ url: FULLNODE_URL });

// 最大Epoch增量
const MAX_EPOCH_INCREMENT = 2;

export const SuiService = {
  // 创建临时密钥对
  async createEphemeralKeyPair(): Promise<EphemeralKeyPair> {
    const { epoch } = await suiClient.getLatestSuiSystemState();
    const currentEpoch = Number(epoch);
    const maxEpoch = currentEpoch + MAX_EPOCH_INCREMENT;
    
    const keypair = new Ed25519Keypair();
    const randomness = generateRandomness();
    const nonce = generateNonce(keypair.getPublicKey(), maxEpoch, randomness);
    
    return {
      keypair: {
        publicKey: toB64(keypair.getPublicKey().toRawBytes()),
        secretKey: keypair.getSecretKey()
      },
      randomness,
      maxEpoch,
      nonce
    };
  },

  // 获取扩展公钥
  getExtendedPublicKey(keypair: Ed25519Keypair): string {
    return getExtendedEphemeralPublicKey(keypair.getPublicKey());
  },

  // 从JWT计算zkLogin地址
  deriveZkLoginAddress(jwt: string, userSalt: string): string {
    return jwtToAddress(jwt, userSalt);
  },

  // 激活zkLogin地址
  async activateAddress(address: string): Promise<boolean> {
    try {
      const response = await fetch('https://faucet.devnet.sui.io/v2/gas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          FixedAmountRequest: { recipient: address }
        })
      });
      
      return response.ok;
    } catch (error) {
      console.error('激活地址失败:', error);
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