import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { COMMON_CONTRACT, CONTRACT_ADDRESSES } from '../config/contracts';
import { toast } from 'react-hot-toast';
import { DrawResult, LotteryHistoryResponse, LotteryStats } from '../interfaces/Lottery';
import { API_ENDPOINTS } from '../app/api/endpoints';
import { api } from '../app/api/clients';
import { useZkLoginTransactions } from '@/hooks/useZkLoginTransactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { PartialZkLoginSignature } from '@/interfaces/ZkLogin';
import { SUI_RPC_URL } from '@/config/client';
// Sui客户端配置
const FULLNODE_URL = SUI_RPC_URL;

// 自定义错误类
export class LotteryError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'LotteryError';
  }
}

export class LotteryService {
  private client: SuiClient;

  constructor() {
    // 创建自己的SuiClient实例
    this.client = new SuiClient({ url: FULLNODE_URL });
  }

  // 即时抽奖 - 接收所有zkLogin参数
  async instantDraw(
    zkLoginAddress: string,
    ephemeralKeyPair: Ed25519Keypair,
    partialSignature: PartialZkLoginSignature,
    userSalt: string,
    decodedJwt: any
  ): Promise<DrawResult> {
    try {
      // 验证参数
      if (!zkLoginAddress) {
        throw new LotteryError('未提供zkLogin地址');
      }
      
      if (!ephemeralKeyPair) {
        throw new LotteryError('未提供临时密钥对');
      }
      
      if (!partialSignature) {
        throw new LotteryError('未提供zkLogin部分签名', { signature: partialSignature });
      }
      
      if (!userSalt) {
        throw new LotteryError('未提供用户盐值');
      }
      
      if (!decodedJwt) {
        throw new LotteryError('未提供JWT数据');
      }
      
      // 创建交易
      const txb = new Transaction();
      
      // 设置发送者
      txb.setSender(zkLoginAddress);
      
      // 添加抽奖调用
      txb.moveCall({
        target: `${CONTRACT_ADDRESSES.LOTTERY.PACKAGE_ID}::${CONTRACT_ADDRESSES.LOTTERY.MODULE_NAME}::instant_draw`,
        arguments: [
          txb.object(CONTRACT_ADDRESSES.LOTTERY_POOL.LOTTERY_POOL_OBJECT_ID),
          txb.object(COMMON_CONTRACT.RANDOM_NUMBER_GENERATOR),
          txb.object(CONTRACT_ADDRESSES.AUTHENTICATION.REGISTRY_OBJECT_ID)
        ]
      });
      
      // 使用useZkLoginTransactions执行交易
      const { signAndExecuteTransaction } = useZkLoginTransactions();
      
      // 执行交易，使用签名并执行方法
      const txResult = await signAndExecuteTransaction(
        txb,
        zkLoginAddress,
        ephemeralKeyPair,
        partialSignature,
        userSalt,
        decodedJwt
      );
      
      // 如果交易哈希存在，则认为交易已提交到链上
      if (txResult.digest) {
        console.log("交易已提交，ID:", txResult.digest);
        console.log("交易详情:", txResult);
        
        // 添加原始txResult调试异常
        if (!txResult.events) {
          throw new Error(`事件为空: txResult.events=${JSON.stringify(txResult.events)}, 类型=${typeof txResult.events}`);
        }
        
        // 检查交易结果中是否包含InstantWin事件
        const events = txResult.events || [];
        
        // 添加事件数组调试异常
        if (events.length === 0) {
          throw new Error(`未检测到任何事件: events=${JSON.stringify(events)}`);
        }
        
        // 构建事件匹配结果报告，用于调试
        const eventReport = events.map((event, index) => {
          if (!event || !event.type) {
            return { index, valid: false, message: "事件无效或没有type属性" };
          }
          
          // 检查是否匹配InstantWin
          const isInstantWin = event.type.includes('InstantWin');
          
          // 检查是否匹配PrizeWithdrawn
          const isPrizeWithdrawn = event.type.includes('PrizeWithdrawn');
          
          // 检查数据结构
          const hasAmount = event.parsedJson && typeof (event.parsedJson as Record<string, any>).amount !== 'undefined';
          const hasPlayer = event.parsedJson && typeof (event.parsedJson as Record<string, any>).player !== 'undefined';
          
          return {
            index,
            type: event.type,
            parsedJsonSummary: event.parsedJson ? Object.keys(event.parsedJson) : [],
            isInstantWin,
            isPrizeWithdrawn,
            hasAmount,
            hasPlayer
          };
        });
        
        // 使用更健壮的检测方法查找抽奖事件
        const instantWinEvent = events.find(event => 
          event && event.type && (
            event.type.includes(`${CONTRACT_ADDRESSES.LOTTERY.PACKAGE_ID}::lottery::InstantWin`) || 
            event.type.includes('InstantWin')
          )
        );
        
        const prizeWithdrawnEvent = events.find(event => 
          event && event.type && event.type.includes('PrizeWithdrawn')
        );
        
        // 提取中奖金额，优先从InstantWin事件中获取
        let winAmount = 0;
        let winSource = "未找到";
        
        if (instantWinEvent && instantWinEvent.parsedJson) {
          const eventData = instantWinEvent.parsedJson as Record<string, any>;
          winAmount = Number(eventData.amount || 0);
          winSource = "InstantWin事件";
        } else if (prizeWithdrawnEvent && prizeWithdrawnEvent.parsedJson) {
          const eventData = prizeWithdrawnEvent.parsedJson as Record<string, any>;
          winAmount = Number(eventData.amount || 0);
          winSource = "PrizeWithdrawn事件";
        }
        
        // // 综合调试异常点 - 提供完整的事件解析信息
        // throw new Error(`事件解析诊断:
        //   1. 找到事件总数: ${events.length}
        //   2. 事件详情: ${JSON.stringify(eventReport)}
        //   3. 找到InstantWin事件: ${!!instantWinEvent}
        //   4. 找到PrizeWithdrawn事件: ${!!prizeWithdrawnEvent}
        //   5. InstantWin事件类型: ${instantWinEvent?.type || '无'}
        //   6. PrizeWithdrawn事件类型: ${prizeWithdrawnEvent?.type || '无'}
        //   7. 提取的金额: ${winAmount}
        //   8. 金额来源: ${winSource}
        //   9. 原始InstantWin事件: ${JSON.stringify(instantWinEvent)}
        //   10. 原始PrizeWithdrawn事件: ${JSON.stringify(prizeWithdrawnEvent)}
        // `);
        
        // 只要有交易ID，我们都视为交易成功
        try {
          // 使用API客户端调用抽奖记录API
          const response = await api.post(
            API_ENDPOINTS.LOTTERY.RECORDS,
            {
              player_address: zkLoginAddress,
              tx_hash: txResult.digest,
              win_amount: winAmount
            }
          );

          if (!response.success) {
            console.warn("记录抽奖结果失败:", response.error);
            // 继续执行，不影响用户体验
          }
        } catch (e) {
          console.warn("记录抽奖结果失败:", e);
          // 继续执行，不影响用户体验
        }
        
        // 中奖处理
        if (winAmount > 0) {
          toast.success(`恭喜！你赢得了 ${winAmount / 1000000000} SUI`);
        } else {
          toast.success('抽奖成功，但未中奖，再接再厉！');
        }
        
        // 返回DrawResult结构
        return {
          success: true,
          txId: txResult.digest,
          amount: winAmount
        };
      }
      // 交易失败情况
      else {
        // 提取详细错误信息
        const statusError = txResult.effects?.status?.error;
        const errorDetails = {
          txDigest: txResult.digest,
          effects: txResult.effects,
          events: txResult.events
        };
        
        throw new LotteryError(`交易执行失败: ${statusError || '执行失败'}`, errorDetails);
      }
    } catch (error: any) {
      // 统一错误处理
      if (error instanceof LotteryError) {
        return {
          success: false,
          error: error.message,
          errorDetails: error.details
        };
      }
      
      return {
        success: false,
        error: `抽奖过程中发生错误: ${error.message || '未知异常'}`,
        errorDetails: {
          errorType: error.name,
          stack: error.stack
        }
      };
    }
  }
  
  // 获取抽奖历史
  async getLotteryHistory(player?: string, limit: number = 10, winnersOnly: boolean = false): Promise<LotteryHistoryResponse> {
    try {
      // 构建查询参数
      let queryParams = new URLSearchParams();
      if (player) queryParams.append('player', player);
      if (limit) queryParams.append('limit', limit.toString());
      if (winnersOnly) queryParams.append('winners_only', 'true');
      
      // 使用API客户端调用历史记录API
      const url = `${API_ENDPOINTS.LOTTERY.HISTORY}?${queryParams.toString()}`;
      const response = await api.get<LotteryHistoryResponse>(url);
      
      if (!response.success) {
        throw new LotteryError(`获取抽奖历史失败: ${response.error?.message || '接口错误'}`, {
          url,
          errorResponse: response.error
        });
      }
      
      return response.data as LotteryHistoryResponse;
    } catch (error: any) {
      if (error instanceof LotteryError) {
        throw error; // 直接抛出自定义错误
      }
      
      // 网络或其他错误
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new LotteryError('API服务不可用，请检查网络连接', {
          originalError: error,
          endpoint: API_ENDPOINTS.LOTTERY.HISTORY
        });
      }
      
      throw new LotteryError(`获取抽奖历史失败: ${error.message || '未知异常'}`, {
        errorType: error.name,
        stack: error.stack
      });
    }
  }

  // 获取抽奖统计数据
  async getLotteryStats(player?: string, period: string = 'all'): Promise<LotteryStats> {
    try {
      // 构建查询参数
      let queryParams = new URLSearchParams();
      if (player) queryParams.append('player', player);
      if (period) queryParams.append('period', period);
      
      // 使用API客户端调用统计API
      const url = `${API_ENDPOINTS.LOTTERY.STATS}?${queryParams.toString()}`;
      const response = await api.get<LotteryStats>(url);
      
      if (!response.success) {
        throw new LotteryError(`获取抽奖统计失败: ${response.error?.message || '接口错误'}`, {
          url,
          errorResponse: response.error,
          parameters: { player, period }
        });
      }
      
      return response.data as LotteryStats;
    } catch (error: any) {
      if (error instanceof LotteryError) {
        throw error; // 直接抛出自定义错误
      }
      
      // 网络或其他错误
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new LotteryError('API服务不可用，请检查网络连接或API端点配置', {
          originalError: error,
          endpoint: API_ENDPOINTS.LOTTERY.STATS,
          parameters: { player, period }
        });
      }
      
      throw new LotteryError(`获取抽奖统计失败: ${error.message || '未知异常'}`, {
        errorType: error.name,
        stack: error.stack,
        parameters: { player, period }
      });
    }
  }
} 