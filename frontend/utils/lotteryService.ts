import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { contractService, CONTRACT_ADDRESSES } from './contractService';
import { toast } from 'react-hot-toast';

export interface DrawResult {
  success: boolean;
  txId?: string;
  amount?: number;
  error?: string;
}

export class LotteryService {
  private client: SuiClient;

  constructor() {
    this.client = contractService.getClient();
  }

  // 获取奖池对象ID - 这里需要根据实际部署的奖池对象ID进行替换
  private getPoolObjectId(): string {
    // 实际使用中，这应该从配置或数据库中获取
    // 这里使用一个示例ID，实际使用时需要替换
    return '0x06717c46fb12546b1b1ecc32976a1b40bf8ea991f99f22364d465eab716faf44';
  }
  
  // 获取Random对象ID - 这里需要根据实际部署的Random对象ID进行替换
  private getRandomObjectId(): string {
    // Sui DevNet上的全局共享Random对象
    // 在实际使用中，应当从网络获取最新的ID
    return '0x0000000000000000000000000000000000000000000000000000000000000008';
  }

  // 即时抽奖
  async instantDraw(
    signer: Ed25519Keypair
  ): Promise<DrawResult> {
    try {
      const sender = signer.getPublicKey().toSuiAddress();
      console.log("使用的发送者地址:", sender);
      
      // 创建交易块
      const txb = new Transaction();
      
      // 设置发送者
      txb.setSender(sender);
      
      // 调用lottery合约的instant_draw方法
      // 根据lottery.move合约，instant_draw函数签名是:
      // public entry fun instant_draw(pool: &mut InstantPool, r: &Random, auth: &AuthRegistry, ctx: &mut TxContext)
      try {
        txb.moveCall({
          target: `${CONTRACT_ADDRESSES.LOTTERY.PACKAGE_ID}::${CONTRACT_ADDRESSES.LOTTERY.MODULE_NAME}::instant_draw`,
          arguments: [
            txb.object(this.getPoolObjectId()),
            txb.object(this.getRandomObjectId()),
            txb.object(contractService.getAuthRegistryObjectId())
          ]
        });
      } catch (callError: any) {
        console.error("创建moveCall失败:", callError);
        return {
          success: false,
          error: `创建moveCall失败: ${callError.message}`
        };
      }
      
      // 构建用于赞助的交易参数对象
      const txData = {
        sender,
        contractPackage: CONTRACT_ADDRESSES.LOTTERY.PACKAGE_ID,
        contractModule: CONTRACT_ADDRESSES.LOTTERY.MODULE_NAME,
        method: 'instant_draw',
        args: [
          this.getPoolObjectId(),
          this.getRandomObjectId(),
          contractService.getAuthRegistryObjectId()
        ]
      };
      
      // 调用赞助交易API
      try {
        console.log("请求赞助交易...");
        const response = await fetch('/api/sponsoredDraw', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            txData,
            senderAddress: sender
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log("赞助抽奖交易执行结果:", result);
          
          if (result.success) {
            console.log("抽奖交易执行成功");
            
            // 随机生成一个中奖结果，就像它是从链上返回的一样
            // 仅用于演示，实际生产环境应该来自链上数据
            const randomWin = Math.random() < 0.3; // 30%的几率中奖
            const winAmount = randomWin ? Math.floor(Math.random() * 1000000000) : 0; // 随机奖励0-1 SUI
            
            // 如果中奖，添加到历史记录
            if (randomWin) {
              toast.success(`恭喜！你赢得了 ${winAmount / 1000000000} SUI`);
            } else {
              toast.success('未中奖，再接再厉！');
            }
            
            return {
              success: true,
              txId: result.txId,
              amount: winAmount
            };
          } else {
            console.error("抽奖交易执行失败:", result.error);
            toast.error(`抽奖失败: ${result.error}`);
            return {
              success: false,
              error: result.error || "未知错误"
            };
          }
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || '赞助交易请求失败');
        }
      } catch (error: any) {
        console.error('赞助交易失败:', error);
        return {
          success: false,
          error: error.message || '赞助交易过程中发生未知错误'
        };
      }
    } catch (error: any) {
      console.error('抽奖失败:', error);
      return {
        success: false,
        error: error.message || '抽奖过程中发生未知错误'
      };
    }
  }
} 