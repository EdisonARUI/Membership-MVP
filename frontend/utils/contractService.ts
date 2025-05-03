import { SuiClient, SuiTransactionBlockResponse } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

// Sui客户端配置
const FULLNODE_URL = 'https://fullnode.devnet.sui.io';
export const suiClient = new SuiClient({ url: FULLNODE_URL });

// 合约地址和模块ID - 请替换为实际部署的合约地址
export const CONTRACT_ADDRESSES = {
  AUTHENTICATION: {
    PACKAGE_ID: '0x...', // 替换为实际部署的authentication包ID
    MODULE_NAME: 'authentication',
    REGISTRY_OBJECT_ID: '0x...', // 替换为实际的AuthRegistry对象ID
  },
  SUBSCRIPTION: {
    PACKAGE_ID: '0x...', // 替换为实际部署的subscription包ID
    MODULE_NAME: 'subscription',
  },
  LOTTERY: {
    PACKAGE_ID: '0x...', // 替换为实际部署的lottery包ID
    MODULE_NAME: 'lottery',
  }
};

export class ContractService {
  private client: SuiClient;

  constructor() {
    this.client = suiClient;
  }

  // 获取AuthRegistry对象ID
  private getAuthRegistryObjectId(): string {
    return CONTRACT_ADDRESSES.AUTHENTICATION.REGISTRY_OBJECT_ID;
  }

  // 注册zkLogin地址
  async registerZkLoginAddress(
    signer: Ed25519Keypair
  ): Promise<{ success: boolean; txId?: string; error?: string }> {
    try {
      const sender = signer.getPublicKey().toSuiAddress();
      
      // 创建交易块
      const txb = new Transaction();
      
      // 调用register_zk_address方法
      txb.moveCall({
        target: `${CONTRACT_ADDRESSES.AUTHENTICATION.PACKAGE_ID}::${CONTRACT_ADDRESSES.AUTHENTICATION.MODULE_NAME}::register_zk_address`,
        arguments: [
          txb.object(this.getAuthRegistryObjectId())
        ]
      });
      
      // 签名并执行交易
      const signData = await txb.sign({ client: this.client, signer });
      const result = await this.client.executeTransactionBlock({
        transactionBlock: signData.bytes,
        signature: signData.signature,
      });
      
      return {
        success: true,
        txId: result.digest
      };
    } catch (error: any) {
      console.error('注册zkLogin地址失败:', error);
      return {
        success: false,
        error: error.message || '注册zkLogin地址时发生未知错误'
      };
    }
  }

  // 绑定钱包地址
  async bindWalletAddress(
    signer: Ed25519Keypair,
    userId: string
  ): Promise<{ success: boolean; txId?: string; error?: string }> {
    try {
      const sender = signer.getPublicKey().toSuiAddress();
      
      // 创建交易块
      const txb = new Transaction();
      
      // 转换userId为Sui Move的vector<u8>
      const userIdBytes = new TextEncoder().encode(userId);
      const userIdArg = txb.pure.vector('u8', Array.from(userIdBytes));
      
      // 调用bind_wallet_address方法
      txb.moveCall({
        target: `${CONTRACT_ADDRESSES.AUTHENTICATION.PACKAGE_ID}::${CONTRACT_ADDRESSES.AUTHENTICATION.MODULE_NAME}::bind_wallet_address`,
        arguments: [
          txb.object(this.getAuthRegistryObjectId()),
          userIdArg
        ]
      });
      
      // 签名并执行交易
      const signData = await txb.sign({ client: this.client, signer });
      const result = await this.client.executeTransactionBlock({
        transactionBlock: signData.bytes,
        signature: signData.signature,
      });
      
      return {
        success: true,
        txId: result.digest
      };
    } catch (error: any) {
      console.error('绑定钱包地址失败:', error);
      return {
        success: false,
        error: error.message || '绑定钱包地址时发生未知错误'
      };
    }
  }

  // 检查地址是否已认证
  async isAddressVerified(
    address: string
  ): Promise<{ verified: boolean; error?: string }> {
    try {
      // 创建交易块
      const txb = new Transaction();
      
      // 调用is_address_verified方法
      txb.moveCall({
        target: `${CONTRACT_ADDRESSES.AUTHENTICATION.PACKAGE_ID}::${CONTRACT_ADDRESSES.AUTHENTICATION.MODULE_NAME}::is_address_verified`,
        arguments: [
          txb.object(this.getAuthRegistryObjectId()),
          txb.pure.address(address)
        ]
      });
      
      // 执行只读调用
      const result = await this.client.devInspectTransactionBlock({
        transactionBlock: await txb.build({ client: this.client }),
        sender: address
      });
      
      // 解析结果
      if (result.results && result.results[0] && result.results[0].returnValues) {
        const verified = Boolean(result.results[0].returnValues[0]);
        return { verified };
      }
      
      return { verified: false };
    } catch (error: any) {
      console.error('检查地址认证状态失败:', error);
      return {
        verified: false,
        error: error.message || '检查地址认证状态时发生未知错误'
      };
    }
  }
}

// 导出服务实例
export const contractService = new ContractService(); 