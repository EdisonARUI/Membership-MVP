import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { contractService } from './contractService';
import { COMMON_CONTRACT, CONTRACT_ADDRESSES } from '../config/contracts';
import { toast } from 'react-hot-toast';
import { DrawResult, LotteryHistoryResponse } from '../interfaces/Lottery';
import { ZkLoginStorage } from './storage';
import { SuiService } from './sui';
import { genAddressSeed, getZkLoginSignature } from '@mysten/sui/zklogin';
import { API_ENDPOINTS } from '../app/api/endpoints';
import { api } from '../app/api/clients';

export class LotteryService {
  private client: SuiClient;

  constructor() {
    // 使用contractService获取客户端，而不是直接创建
    this.client = contractService.getClient();
  }

  // 即时抽奖
  async instantDraw(): Promise<DrawResult> {
    try {
      // 获取zkLogin地址
      const zkLoginAddress = ZkLoginStorage.getZkLoginAddress();
      if (!zkLoginAddress) {
        throw new Error('未找到zkLogin地址，请先完成zkLogin认证');
      }
      
      console.log("使用的发送者地址:", zkLoginAddress);
      
      // 获取必要数据
      const ephemeralKeyPairData = ZkLoginStorage.getEphemeralKeypair();
      if (!ephemeralKeyPairData) {
        throw new Error('未找到临时密钥对，请先完成zkLogin认证');
      }
      
      // 重建临时密钥对
      const ephemeralKeyPair = SuiService.recreateKeypairFromStored(ephemeralKeyPairData.keypair);
      
      // 获取其他必要的zkLogin数据
      const decodedJwt = ZkLoginStorage.getDecodedJwt();
      if (!decodedJwt) {
        throw new Error('未找到JWT数据，请重新登录');
      }
      
      const userSalt = ZkLoginStorage.getZkLoginUserSalt();
      if (!userSalt) {
        throw new Error('未找到用户盐值，请重新登录');
      }
      
      // 使用ZkLoginStorage中的zkLoginSignature或从localStorage获取
      const partialZkLoginSignature = ZkLoginStorage.getZkLoginPartialSignature();
        
      if (!partialZkLoginSignature) {
        throw new Error('未找到zkLogin部分签名，请重新登录');
      }
      
      console.log("准备创建和签名交易...");
      
      // 创建交易
      const txb = new Transaction();
      
      // 设置发送者
      txb.setSender(zkLoginAddress);
      
      // 添加抽奖调用
      txb.moveCall({
        target: `${CONTRACT_ADDRESSES.LOTTERY.PACKAGE_ID}::${CONTRACT_ADDRESSES.LOTTERY.MODULE_NAME}::instant_draw`,
        arguments: [
          txb.object(CONTRACT_ADDRESSES.LOTTERY.LOTTERY_POOL),
          txb.object(COMMON_CONTRACT.RANDOM_NUMBER_GENERATOR),
          txb.object(CONTRACT_ADDRESSES.AUTHENTICATION.REGISTRY_OBJECT_ID)
        ]
      });
      
      // 使用临时密钥对签名
      console.log("使用临时密钥对签名交易...");
      const { bytes, signature: userSignature } = await txb.sign({
        client: this.client,
        signer: ephemeralKeyPair,
      });
      
      // 生成地址种子
      console.log("生成地址种子...");
      const addressSeed = genAddressSeed(
        BigInt(userSalt),
        "sub",
        decodedJwt.sub,
        decodedJwt.aud
      ).toString();
      
      // 创建zkLogin签名
      console.log("创建zkLogin签名...");
      const zkLoginSignature = getZkLoginSignature({
        inputs: {
          proofPoints: partialZkLoginSignature.inputs.proofPoints,
          issBase64Details: {
            value: partialZkLoginSignature.inputs.jwkHex,
            indexMod4: 0, // 这个值可能需要根据实际情况调整
          },
          headerBase64: Buffer.from(
            JSON.stringify({ alg: "RS256", typ: "JWT" })
          ).toString('base64'),
          addressSeed
        },
        maxEpoch: partialZkLoginSignature.inputs.maxEpoch,
        userSignature,
      });
      
      // 执行交易
      console.log("提交交易到链上...");
      const txResult = await this.client.executeTransactionBlock({
        transactionBlock: bytes,
        signature: zkLoginSignature,
      });
      
      console.log("交易结果:", txResult);
      
      // 处理交易结果
      if (txResult.effects?.status?.status === 'success') {
        // 检查是否有 InstantWin 事件
        const events = txResult.events || [];
        const instantWinEvent = events.find((event: any) => 
          event.type.includes('InstantWin')
        );
        
        // 如果有 InstantWin 事件，表示中奖
        const randomWin = !!instantWinEvent;
        const winAmount = randomWin && instantWinEvent && instantWinEvent.parsedJson 
          ? Number((instantWinEvent.parsedJson as { amount: string }).amount) 
          : 0;
        
        console.log("抽奖结果:", { randomWin, winAmount });
        
        // 记录抽奖结果到后端
        try {
          // 使用API客户端调用而不是直接fetch
          const response = await api.post(
            API_ENDPOINTS.LOTTERY.RECORD,
            {
              player_address: zkLoginAddress,
              tx_hash: txResult.digest,
              win_amount: winAmount
            }
          );

          if (!response.success) {
            console.error("记录抽奖结果失败:", response.error);
          }
        } catch (e) {
          console.error("记录抽奖结果失败:", e);
          // 继续执行，不中断流程
        }
        
        // 中奖处理
        if (randomWin) {
          toast.success(`恭喜！你赢得了 ${winAmount / 1000000000} SUI`);
        } else {
          toast.success('未中奖，再接再厉！');
        }
        
        // 返回DrawResult结构，与Lottery.ts中定义一致
        return {
          success: true,
          txId: txResult.digest,
          amount: winAmount
        };
      } else {
        const errorMsg = txResult.effects?.status?.error || '未知错误';
        console.error("交易执行失败:", errorMsg);
        
        return {
          success: false,
          error: `交易执行失败: ${errorMsg}`
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
  
  // 获取抽奖历史
  async getLotteryHistory(player?: string, limit: number = 10, winnersOnly: boolean = false): Promise<LotteryHistoryResponse> {
    try {
      // 构建查询参数
      let queryParams = new URLSearchParams();
      if (player) queryParams.append('player', player);
      if (limit) queryParams.append('limit', limit.toString());
      if (winnersOnly) queryParams.append('winners_only', 'true');
      
      // 使用API客户端调用
      const url = `${API_ENDPOINTS.LOTTERY.HISTORY}?${queryParams.toString()}`;
      const response = await api.get<LotteryHistoryResponse>(url);
      
      if (!response.success) {
        throw new Error(response.error?.message || '获取抽奖历史失败');
      }
      
      return response.data as LotteryHistoryResponse;
    } catch (error: any) {
      console.error('获取抽奖历史失败:', error);
      // 返回一个符合LotteryHistoryResponse格式的错误响应
      return {
        success: false,
        error: error.message || '获取抽奖历史失败',
        records: []
      };
    }
  }
} 