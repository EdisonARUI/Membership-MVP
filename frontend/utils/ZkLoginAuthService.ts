import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { PartialZkLoginSignature } from '@/interfaces/ZkLogin';
import { useZkLoginTransactions } from '@/hooks/useZkLoginTransactions';
import { SUI_RPC_URL } from '@/config/client';

// Sui客户端配置
const FULLNODE_URL = SUI_RPC_URL;
export const suiClient = new SuiClient({ url: FULLNODE_URL });



export class ContractService {
  private client: SuiClient;

  constructor() {
    this.client = suiClient;
  }

  // 获取Sui客户端
  getClient(): SuiClient {
    return this.client;
  }

  // 注册zkLogin地址 - 使用zkLogin签名
  async registerZkLoginAddress(
    zkLoginAddress: string,
    ephemeralKeyPair: Ed25519Keypair,
    partialSignature: PartialZkLoginSignature,
    userSalt: string,
    decodedJwt: any
  ): Promise<{ success: boolean; txId?: string; error?: string }> {
    try {
      console.log("使用的zkLogin发送者地址:", zkLoginAddress);
      
      // 创建交易块
      const txb = new Transaction();
      
      // 调用register_zk_address方法
        txb.moveCall({
          target: `${CONTRACT_ADDRESSES.AUTHENTICATION.PACKAGE_ID}::${CONTRACT_ADDRESSES.AUTHENTICATION.MODULE_NAME}::register_zk_address`,
          arguments: [
            txb.object(CONTRACT_ADDRESSES.AUTHENTICATION.REGISTRY_OBJECT_ID)
          ]
        });
      
      // 使用zkLogin签名并执行交易
      const { signAndExecuteTransaction } = useZkLoginTransactions();
      
      try {
        const result = await signAndExecuteTransaction(
          txb,
          zkLoginAddress,
          ephemeralKeyPair,
          partialSignature,
          userSalt,
          decodedJwt
        );
        
        console.log("交易完整结果:", JSON.stringify(result, null, 2));
        
      if (result.effects?.status?.status === "success") {
        console.log("register_zk_address交易执行成功");
        return {
          success: true,
          txId: result.digest
        };
      } else {
          console.error("交易执行失败详情:", JSON.stringify(result.effects, null, 2));
          
          // 提取更详细的错误信息
          let errorDetails = '';
          
          if (result.effects?.status?.error) {
            errorDetails = result.effects.status.error;
          } else if (result.effects) {
            // 尝试从effects中获取更多信息
            errorDetails = JSON.stringify(result.effects, null, 2);
          } else if (result.errors && result.errors.length > 0) {
            errorDetails = JSON.stringify(result.errors, null, 2);
          } else {
            errorDetails = JSON.stringify(result, null, 2);
          }
          
          return {
            success: false,
            error: `交易执行失败: ${errorDetails}`
          };
        }
      } catch (executeError: any) {
        // 更详细的错误日志
        console.error("执行交易异常详情:", executeError);
        console.error("异常堆栈:", executeError.stack);
        
        let errorMsg = '';
        if (typeof executeError === 'object') {
          try {
            // 尝试提取所有可能的错误信息
            errorMsg = JSON.stringify({
              message: executeError.message,
              name: executeError.name,
              code: executeError.code,
              cause: executeError.cause,
              data: executeError.data
            }, (key, value) => value === undefined ? 'undefined' : value, 2);
          } catch (e) {
            errorMsg = executeError.message || executeError.toString();
          }
        } else {
          errorMsg = String(executeError);
        }
        
        return {
          success: false,
          error: `执行交易失败: ${errorMsg}`
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
  async isAddressVerified(address: string): Promise<{ verified: boolean; error?: string }> {
    try {
      const txb = new Transaction();
      txb.moveCall({
          target: `${CONTRACT_ADDRESSES.AUTHENTICATION.PACKAGE_ID}::${CONTRACT_ADDRESSES.AUTHENTICATION.MODULE_NAME}::is_address_verified`,
        arguments: [txb.object(CONTRACT_ADDRESSES.AUTHENTICATION.REGISTRY_OBJECT_ID), txb.pure.address(address)]
        });
      
      const result = await this.client.devInspectTransactionBlock({
        sender: address,
        transactionBlock: txb
      });
      
      // 检查返回值 - Sui返回的格式是 [number[], string]，第一个元素是BCS编码，第二个是类型
      if (result.results && result.results[0]?.returnValues && result.results[0].returnValues.length > 0) {
        // 获取原始返回值 - 布尔值在Sui中通常用0表示false，1表示true
        const bcsBytes = result.results[0].returnValues[0][0]; // 获取BCS编码的字节数组
        
        // 通常布尔值会被编码为单个字节，1表示true，0表示false
        if (Array.isArray(bcsBytes) && bcsBytes.length > 0) {
          return { verified: bcsBytes[0] === 1 };
        }
        
        console.log("返回值解析:", result.results[0].returnValues);
      }
      
      return { verified: false, error: "无法解析返回值" };
    } catch (error: any) {
      console.error("检查地址验证状态失败:", error);
      return {
        verified: false,
        error: `检查地址验证失败: ${error.message || JSON.stringify(error)}`
      };
    }
  }

  // 绑定钱包地址 - 使用zkLogin签名
  async bindWalletAddress(
    zkLoginAddress: string,
    userId: string,
    ephemeralKeyPair: Ed25519Keypair,
    partialSignature: PartialZkLoginSignature,
    userSalt: string,
    decodedJwt: any
  ): Promise<{ success: boolean; txId?: string; error?: string }> {
    try {
      console.log("使用的zkLogin发送者地址:", zkLoginAddress);
      console.log("绑定的用户ID (原始):", userId);
      
      // 创建交易块
      const txb = new Transaction();
      
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
      txb.moveCall({
        target: `${CONTRACT_ADDRESSES.AUTHENTICATION.PACKAGE_ID}::${CONTRACT_ADDRESSES.AUTHENTICATION.MODULE_NAME}::bind_wallet_address`,
        arguments: [
          txb.object(CONTRACT_ADDRESSES.AUTHENTICATION.REGISTRY_OBJECT_ID),
          userIdArg
        ]
      });
      
      // 使用zkLogin签名并执行交易
      const { signAndExecuteTransaction } = useZkLoginTransactions();
      
      try {
        const result = await signAndExecuteTransaction(
          txb,
          zkLoginAddress,
          ephemeralKeyPair,
          partialSignature,
          userSalt,
          decodedJwt
        );
      
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
      } catch (executeError: any) {
        console.error("执行交易失败:", executeError);
        return {
          success: false,
          error: `执行交易失败: ${executeError.message}`
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