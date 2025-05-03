import { SuiClient, SuiTransactionBlockResponse } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

// Sui客户端配置
const FULLNODE_URL = 'https://fullnode.devnet.sui.io';
export const suiClient = new SuiClient({ url: FULLNODE_URL });

// 合约地址和模块ID - 请替换为实际部署的合约地址
export const CONTRACT_ADDRESSES = {
  AUTHENTICATION: {
    PACKAGE_ID: '0x1168aecdd3a3eb28b570b0af6bb0ab23966ab08b7ab31e7f7c7ddf8164a29f0b', // 替换为实际部署的authentication包ID
    MODULE_NAME: 'authentication',
    REGISTRY_OBJECT_ID: '0x06717c46fb12546b1b1ecc32976a1b40bf8ea991f99f22364d465eab716faf44', // 替换为实际的AuthRegistry对象ID
  },
  SUBSCRIPTION: {
    PACKAGE_ID: '0xcc52f1b8380ed5afe40341cfd85de3388c160c28569bac8b42dc8acdc632549d', // 替换为实际部署的subscription包ID
    MODULE_NAME: 'subscription',
  },
  LOTTERY: {
    PACKAGE_ID: '0x721afb29471a5b0c67eda9674ede2e2e1c2d3653c5c7239dffc6d87182e70254', // 替换为实际部署的lottery包ID
    MODULE_NAME: 'lottery',
  }
};

export class ContractService {
  private client: SuiClient;

  constructor() {
    this.client = suiClient;
  }

  // 获取Sui客户端
  getClient(): SuiClient {
    return this.client;
  }

  // 获取AuthRegistry对象ID
  getAuthRegistryObjectId(): string {
    return CONTRACT_ADDRESSES.AUTHENTICATION.REGISTRY_OBJECT_ID;
  }

  // 注册zkLogin地址
  async registerZkLoginAddress(
    signer: Ed25519Keypair
  ): Promise<{ success: boolean; txId?: string; error?: string }> {
    try {
      const sender = signer.getPublicKey().toSuiAddress();
      console.log("使用的发送者地址:", sender);
      
      // 创建交易块
      const txb = new Transaction();
      
      // 明确设置发送者
      txb.setSender(sender);
      
      // 获取发送方账户信息，确认有足够的gas
      try {
        const accountInfo = await this.client.getCoins({
          owner: sender
        });
        
        if (!accountInfo || !accountInfo.data || accountInfo.data.length === 0) {
          console.error("账户没有可用币:", sender);
          return {
            success: false,
            error: "账户没有可用币，请确保地址已充值SUI"
          };
        }
        
        // 找到一个可用的coin对象作为gas
        const gasCoin = accountInfo.data[0];
        console.log("使用gas币:", gasCoin.coinObjectId);
        
        // 使用正确的方式引用coin对象
        txb.setGasPayment([
          { objectId: gasCoin.coinObjectId, digest: gasCoin.digest, version: gasCoin.version }
        ]);
      } catch (gasError: any) {
        console.error("获取gas币失败:", gasError);
        return {
          success: false,
          error: `获取gas币失败: ${gasError.message}`
        };
      }
      
      // 根据authentication.move合约，register_zk_address函数签名是:
      // public entry fun register_zk_address(registry: &mut AuthRegistry, ctx: &mut TxContext)
      // 只需要提供AuthRegistry对象作为参数
      try {
        txb.moveCall({
          target: `${CONTRACT_ADDRESSES.AUTHENTICATION.PACKAGE_ID}::${CONTRACT_ADDRESSES.AUTHENTICATION.MODULE_NAME}::register_zk_address`,
          arguments: [
            txb.object(this.getAuthRegistryObjectId())
          ]
        });
      } catch (callError: any) {
        console.error("创建moveCall失败:", callError);
        return {
          success: false,
          error: `创建moveCall失败: ${callError.message}`
        };
      }
      
      // 构建交易块
      let builtTxb;
      try {
        console.log("准备构建register_zk_address交易块...");
        builtTxb = await txb.build({ client: this.client });
        console.log("register_zk_address交易块构建成功");
      } catch (buildError: any) {
        console.error("构建交易块失败:", buildError);
        return {
          success: false,
          error: `构建交易块失败: ${buildError.message}`
        };
      }
      
      // 签名并执行交易
      let signData;
      try {
        console.log("准备签名register_zk_address交易...");
        signData = await txb.sign({ client: this.client, signer });
        console.log("register_zk_address交易已签名，准备执行");
      } catch (signError: any) {
        console.error("签名交易失败:", signError);
        return {
          success: false,
          error: `签名交易失败: ${signError.message}`
        };
      }
      
      // 执行交易
      let result;
      try {
        result = await this.client.executeTransactionBlock({
          transactionBlock: signData.bytes,
          signature: signData.signature,
          options: {
            showEffects: true,
            showEvents: true
          }
        });
        
        console.log("register_zk_address交易执行结果:", result);
      } catch (executeError: any) {
        console.error("执行交易失败:", executeError);
        return {
          success: false,
          error: `执行交易失败: ${executeError.message}`
        };
      }
      
      // 检查交易是否成功
      if (result.effects?.status?.status === "success") {
        console.log("register_zk_address交易执行成功");
        return {
          success: true,
          txId: result.digest
        };
      } else {
        console.error("register_zk_address交易执行失败:", result.effects?.status);
        return {
          success: false,
          error: `交易执行失败: ${result.effects?.status?.error || "未知错误"}`
        };
      }
    } catch (error: any) {
      console.error('注册zkLogin地址失败:', error);
      return {
        success: false,
        error: error.message || '注册zkLogin地址时发生未知错误'
      };
    }
  }

  // 检查地址是否已认证
  async isAddressVerified(
    address: string
  ): Promise<{ verified: boolean; error?: string }> {
    try {
      console.log("检查地址认证状态:", address);
      
      // 验证地址格式
      if (!address || !address.startsWith('0x') || address.length < 32) {
        console.error("无效的地址格式:", address);
        return { verified: false, error: "无效的地址格式" };
      }
      
      // 创建交易块
      const txb = new Transaction();
      
      // 明确设置发送者 - 这里可能出现了反序列化错误
      try {
        txb.setSender(address);
      } catch (error) {
        console.error("设置发送者失败:", error);
        return { verified: false, error: "设置发送者失败" };
      }
      
      // 调用is_address_verified方法
      let moveCallResult;
      try {
        moveCallResult = txb.moveCall({
          target: `${CONTRACT_ADDRESSES.AUTHENTICATION.PACKAGE_ID}::${CONTRACT_ADDRESSES.AUTHENTICATION.MODULE_NAME}::is_address_verified`,
          arguments: [
            txb.object(this.getAuthRegistryObjectId()),
            txb.pure.address(address)
          ]
        });
        console.log("moveCall创建成功:", moveCallResult);
      } catch (error) {
        console.error("创建moveCall失败:", error);
        return { verified: false, error: "创建moveCall失败" };
      }
      
      // 构建交易
      let builtTxb;
      try {
        builtTxb = await txb.build({ client: this.client });
        console.log("交易构建成功");
      } catch (error) {
        console.error("构建交易失败:", error);
        return { verified: false, error: "构建交易失败" };
      }
      
      // 执行只读调用
      let result;
      try {
        result = await this.client.devInspectTransactionBlock({
          transactionBlock: builtTxb,
          sender: address
        });
        console.log("验证结果:", result);
      } catch (error) {
        console.error("执行devInspectTransactionBlock失败:", error);
        // 如果是反序列化错误，很可能该地址尚未注册，直接返回false
        return { verified: false };
      }
      
      // 修改点：更安全地解析结果
      if (result && result.results && result.results.length > 0) {
        try {
          // 使用更安全的解析方式
          const returnValues = result.results[0].returnValues;
          if (returnValues && returnValues.length > 0) {
            // 尝试将返回值解析为布尔值
            // 检查结果类型并相应处理
            if (typeof returnValues[0] === 'boolean') {
              return { verified: returnValues[0] };
            } else if (typeof returnValues[0] === 'number') {
              return { verified: returnValues[0] !== 0 };
            } else if (typeof returnValues[0] === 'string' && (returnValues[0] === 'true' || returnValues[0] === '1')) {
              return { verified: true };
            } else {
              console.log("无法识别的返回值类型:", typeof returnValues[0], returnValues[0]);
              return { verified: false };
            }
          }
        } catch (error) {
          console.error("解析结果失败:", error);
          return { verified: false, error: "解析结果失败" };
        }
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

  // 绑定钱包地址
  async bindWalletAddress(
    signer: Ed25519Keypair,
    userId: string
  ): Promise<{ success: boolean; txId?: string; error?: string }> {
    try {
      const sender = signer.getPublicKey().toSuiAddress();
      console.log("使用的发送者地址:", sender);
      console.log("绑定的用户ID (原始):", userId);
      
      // 创建交易块
      const txb = new Transaction();
      
      // 明确设置发送者
      txb.setSender(sender);
      
      // 获取发送方账户信息，确认有足够的gas
      try {
        const accountInfo = await this.client.getCoins({
          owner: sender
        });
        
        if (!accountInfo || !accountInfo.data || accountInfo.data.length === 0) {
          console.error("账户没有可用币:", sender);
          return {
            success: false,
            error: "账户没有可用币，请确保地址已充值SUI"
          };
        }
        
        // 找到一个可用的coin对象作为gas
        const gasCoin = accountInfo.data[0];
        console.log("使用gas币:", gasCoin.coinObjectId);
        
        // 使用正确的方式引用coin对象
        txb.setGasPayment([
          { objectId: gasCoin.coinObjectId, digest: gasCoin.digest, version: gasCoin.version }
        ]);
      } catch (gasError: any) {
        console.error("获取gas币失败:", gasError);
        return {
          success: false,
          error: `获取gas币失败: ${gasError.message}`
        };
      }
      
      // 确保userId是字符串并且不包含特殊字符
      // 我们只保留字母、数字和基本标点符号
      const safeUserId = String(userId).replace(/[^\w\s\-]/g, '');
      console.log("过滤后的userId:", safeUserId);
      
      // 转换userId为Sui Move的vector<u8>
      const userIdBytes = new TextEncoder().encode(safeUserId);
      console.log("转换后的userId字节:", Array.from(userIdBytes));
      
      // 使用更简单的方式创建vector<u8>类型参数
      // 默认情况下使用纯字符串，如果出错，尝试更简单的值
      let userIdArg;
      try {
        userIdArg = txb.pure.vector('u8', Array.from(userIdBytes));
      } catch (error) {
        console.error("创建userIdArg失败，尝试使用更简单的值:", error);
        // 使用简单的"user"字符串作为后备方案
        const fallbackBytes = new TextEncoder().encode("user");
        userIdArg = txb.pure.vector('u8', Array.from(fallbackBytes));
      }
      
      // 调用bind_wallet_address方法
      // 根据authentication.move合约，函数签名是:
      // public entry fun bind_wallet_address(registry: &mut AuthRegistry, user_id: vector<u8>, ctx: &mut TxContext)
      txb.moveCall({
        target: `${CONTRACT_ADDRESSES.AUTHENTICATION.PACKAGE_ID}::${CONTRACT_ADDRESSES.AUTHENTICATION.MODULE_NAME}::bind_wallet_address`,
        arguments: [
          txb.object(this.getAuthRegistryObjectId()),
          userIdArg
        ]
      });
      
      // 构建交易块
      console.log("准备构建交易块...");
      const builtTxb = await txb.build({ client: this.client });
      console.log("交易块构建成功");
      
      // 签名并执行交易
      console.log("准备签名交易...");
      const signData = await txb.sign({ client: this.client, signer });
      console.log("交易已签名，准备执行");
      
      const result = await this.client.executeTransactionBlock({
        transactionBlock: signData.bytes,
        signature: signData.signature,
        options: {
          showEffects: true,
          showEvents: true
        }
      });
      
      console.log("交易执行结果:", result);
      
      // 检查交易是否成功
      if (result.effects?.status?.status === "success") {
        console.log("交易执行成功");
        return {
          success: true,
          txId: result.digest
        };
      } else {
        console.error("交易执行失败:", result.effects?.status);
        return {
          success: false,
          error: `交易执行失败: ${result.effects?.status?.error || "未知错误"}`
        };
      }
    } catch (error: any) {
      console.error('绑定钱包地址失败:', error);
      return {
        success: false,
        error: error.message || '绑定钱包地址时发生未知错误'
      };
    }
  }
}

// 导出服务实例
export const contractService = new ContractService(); 