import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { PartialZkLoginSignature } from '@/interfaces/ZkLogin';
import { 
  CreateSubscriptionRequest, 
  CreateSubscriptionResponse,
  RenewSubscriptionRequest, 
  RenewSubscriptionResponse,
  CancelSubscriptionRequest, 
  CancelSubscriptionResponse,
  SubscriptionStatusResponse,
  ToggleAutoRenewRequest,
  ToggleAutoRenewResponse,
  PlansResponse,
  PlanResponse,
  SubscriptionResponse,
  SubscriptionsResponse,
  ApiResponse,
  Subscription,
  SubscriptionPlan
} from '@/interfaces/Subscription';
import { useZkLoginTransactions } from '@/hooks/useZkLoginTransactions';
import { COMMON_CONTRACT, CONTRACT_ADDRESSES } from '@/config/contracts';
import { API_ENDPOINTS } from '@/app/api/endpoints';
import { api } from '@/app/api/clients';
import { TOKENS, toTokenAmount, fromTokenAmount } from '@/config/tokens';

const FULLNODE_URL = 'https://fullnode.devnet.sui.io';

export class SubscriptionService {
  private client: SuiClient;
  private zkLoginTransactions: ReturnType<typeof useZkLoginTransactions>;

  constructor() {
    this.client = new SuiClient({ url: FULLNODE_URL });
    this.zkLoginTransactions = useZkLoginTransactions();
  }

  // 辅助方法: 获取订阅计划详情
  private async getSubscriptionPlan(planId: string): Promise<SubscriptionPlan> {
    const queryParams = new URLSearchParams();
    queryParams.append('plan_id', planId);
    const url = `${API_ENDPOINTS.SUBSCRIPTION.PLANS}?${queryParams.toString()}`;
    const planResponse = await api.get<PlanResponse>(url);
    
    if (!planResponse.success || !planResponse.data?.plan) {
      throw new Error(`获取计划详情失败: ${planResponse.error?.message || '未知错误'}, 请求参数: plan_id=${planId}`);
    }
    
    const plan = planResponse.data.plan;
    
    // 验证计划信息完整性
    if (!plan.id || !plan.name || !plan.period || typeof plan.price !== 'number') {
      throw new Error(`计划信息不完整或格式错误: ${JSON.stringify(plan)}`);
    }
    
    return plan;
  }
  
  // 辅助方法: 计算订阅时长（毫秒）
  private calculateDuration(period: string): number {
    switch (period) {
      case 'monthly':
        return 30 * 24 * 60 * 60 * 1000; // 30天
      case 'quarterly':
        return 90 * 24 * 60 * 60 * 1000; // 90天
      case 'yearly':
        return 365 * 24 * 60 * 60 * 1000; // 365天
      default:
        throw new Error(`未知的订阅周期: ${period}`);
    }
  }
  
  // 辅助方法: 准备支付代币
  private async preparePaymentCoin(
    txb: Transaction, 
    zkLoginAddress: string, 
    paymentAmount: bigint
  ): Promise<any> {
    // 获取用户的TEST_USDT代币对象
    const coinData = await this.client.getCoins({
      owner: zkLoginAddress,
      coinType: TOKENS.TEST_USDT.coinType || ''
    });
    
    if (!coinData || !coinData.data || coinData.data.length === 0) {
      throw new Error(`未找到${TOKENS.TEST_USDT.symbol}代币`);
    }
    
    const coinObjects = coinData.data;
    
    // 余额显示时使用精度转换函数
    const totalBalance = coinObjects.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));
    if (totalBalance < paymentAmount) {
      throw new Error(`余额不足，需要 ${fromTokenAmount(paymentAmount, TOKENS.TEST_USDT)} ${TOKENS.TEST_USDT.symbol}，现有 ${fromTokenAmount(totalBalance, TOKENS.TEST_USDT)} ${TOKENS.TEST_USDT.symbol}`);
    }
    
    // 选择一个足够大的代币对象拆分
    const coinToSplit = coinObjects.find(coin => BigInt(coin.balance) >= paymentAmount);
    if (!coinToSplit || !coinToSplit.coinObjectId) {
      throw new Error(`没有找到足够大的代币对象，需要 ${fromTokenAmount(paymentAmount, TOKENS.TEST_USDT)} ${TOKENS.TEST_USDT.symbol}`);
    }

    // 正确使用splitCoins - 返回的是分割出的新币数组
    const [paymentCoin] = txb.splitCoins(txb.object(coinToSplit.coinObjectId), [paymentAmount]);
    return paymentCoin;
  }
  
  // 辅助方法: 执行zkLogin交易
  private async executeZkLoginTransaction(
    txb: Transaction,
    zkLoginAddress: string,
    ephemeralKeyPair: Ed25519Keypair,
    partialSignature: PartialZkLoginSignature,
    userSalt: string,
    decodedJwt: any
  ) {
    return await this.zkLoginTransactions.signAndExecuteTransaction(
      txb,
      zkLoginAddress,
      ephemeralKeyPair,
      partialSignature,
      userSalt,
      decodedJwt
    );
  }
  
  // 辅助方法: 从事件中提取对象ID
  private extractObjectIdFromEvents(events: any[] | null | undefined, eventType: string): string | null {
    if (!events || events.length === 0) return null;
    
    const targetEvent = events.find(event => 
      event && event.type && event.type.includes(eventType)
    );
    
    if (targetEvent && targetEvent.parsedJson && 'subscription_id' in targetEvent.parsedJson) {
      return targetEvent.parsedJson.subscription_id;
    }
    
    return null;
  }

  // 创建订阅
  async createSubscription(
    request: CreateSubscriptionRequest,
    zkLoginAddress: string,
    ephemeralKeyPair: Ed25519Keypair,
    partialSignature: PartialZkLoginSignature,
    userSalt: string,
    decodedJwt: any
  ): Promise<CreateSubscriptionResponse> {
    try {
      // 创建交易
      const txb = new Transaction();
      txb.setSender(zkLoginAddress);
      
      // 1. 获取订阅计划详情
      const plan = await this.getSubscriptionPlan(request.plan_id);
      
      // 2. 计算订阅时长（毫秒）
      const duration = this.calculateDuration(plan.period);
      
      // 3. 获取支付金额
      const paymentAmount = toTokenAmount(plan.price, TOKENS.TEST_USDT);
      
      // 4. 准备支付代币
      const paymentCoin = await this.preparePaymentCoin(txb, zkLoginAddress, BigInt(paymentAmount));
      
      try {
        // 5. 调用create_subscription方法
        txb.moveCall({
          target: `${CONTRACT_ADDRESSES.SUBSCRIPTION.PACKAGE_ID}::subscription::create_subscription`,
          arguments: [
            paymentCoin, // 拆分后的代币作为支付
            txb.pure.u64(duration),
            txb.pure.bool(request.auto_renew),
            txb.object(COMMON_CONTRACT.CLOCK),
            txb.object(CONTRACT_ADDRESSES.AUTHENTICATION.REGISTRY_OBJECT_ID),
            txb.object(CONTRACT_ADDRESSES.FUND.FUND_OBJECT_ID)
          ]
        });
      } catch (moveCallError: any) {
        const args = {
          splitCoin: paymentCoin ? '已定义' : '未定义',
          duration, 
          auto_renew: request.auto_renew,
          clock: COMMON_CONTRACT.CLOCK,
          auth_registry: CONTRACT_ADDRESSES.AUTHENTICATION.REGISTRY_OBJECT_ID,
          fund: CONTRACT_ADDRESSES.FUND.FUND_OBJECT_ID
        };
        throw new Error(`调用create_subscription失败: ${moveCallError.message}, 参数=${JSON.stringify(args)}`);
      }
      
      // 6. 执行交易
      const txResult = await this.executeZkLoginTransaction(
        txb,
        zkLoginAddress,
        ephemeralKeyPair,
        partialSignature,
        userSalt,
        decodedJwt
      );

      if (txResult.digest) {
        // 7. 从交易结果中提取创建的subscription对象ID
        const contractObjectId = this.extractObjectIdFromEvents(txResult.events, 'SubscriptionCreatedEvent');
        
        // 8. 记录订阅到后端
        const createResponse = await api.post<SubscriptionResponse>(
          API_ENDPOINTS.SUBSCRIPTION.CREATE,
          {
            user_id: zkLoginAddress,
            plan_id: request.plan_id,
            tx_hash: txResult.digest,
            auto_renew: request.auto_renew,
            contract_object_id: contractObjectId
          }
        );
        
        if (createResponse.success && createResponse.data?.subscription) {
          return {
            success: true,
            subscription: createResponse.data.subscription,
            tx_hash: txResult.digest
          };
        } else {
          return {
            success: false,
            error: `订阅记录创建失败: ${createResponse.error?.message || '未知错误'}`
          };
        }
      } else {
        return {
          success: false,
          error: "交易执行失败",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `创建订阅失败: ${error.message}`
      };
    }
  }
  
  // 续订订阅
  async renewSubscription(
    request: RenewSubscriptionRequest,
    zkLoginAddress: string,
    ephemeralKeyPair: Ed25519Keypair,
    partialSignature: PartialZkLoginSignature,
    userSalt: string,
    decodedJwt: any
  ): Promise<RenewSubscriptionResponse> {
    try {
      // 创建交易
      const txb = new Transaction();
      txb.setSender(zkLoginAddress);
      
      // 1. 获取订阅详情
      const queryParams = new URLSearchParams();
      queryParams.append('subscription_id', request.subscription_id);
      const subscriptionResponse = await api.get<SubscriptionResponse>(
        `${API_ENDPOINTS.SUBSCRIPTION.STATUS}?${queryParams.toString()}`
      );
      
      if (!subscriptionResponse.success || !subscriptionResponse.data?.subscription) {
        throw new Error(`获取订阅详情失败: ${subscriptionResponse.error?.message || '未知错误'}`);
      }
      
      const subscription = subscriptionResponse.data.subscription;
      
      // 2. 检查合约对象ID是否存在
      if (!subscription.contract_object_id) {
        throw new Error('订阅合约对象ID不存在，无法续订');
      }
      
      // 3. 获取计划详情
      const plan = await this.getSubscriptionPlan(subscription.plan_id);
      
      // 4. 获取支付金额
      const paymentAmount = toTokenAmount(plan.price, TOKENS.TEST_USDT);
      
      // 5. 准备支付代币
      const paymentCoin = await this.preparePaymentCoin(txb, zkLoginAddress, BigInt(paymentAmount));
      
      // 6. 调用renew_subscription方法
      txb.moveCall({
        target: `${CONTRACT_ADDRESSES.SUBSCRIPTION.PACKAGE_ID}::subscription::renew_subscription`,
        arguments: [
          txb.object(subscription.contract_object_id), // 订阅对象ID
          paymentCoin, // 拆分后的代币作为支付
          txb.object(COMMON_CONTRACT.CLOCK),
          txb.object(CONTRACT_ADDRESSES.AUTHENTICATION.REGISTRY_OBJECT_ID),
          txb.object(CONTRACT_ADDRESSES.FUND.FUND_OBJECT_ID)
        ]
      });
      
      // 7. 执行交易
      const txResult = await this.executeZkLoginTransaction(
        txb,
        zkLoginAddress,
        ephemeralKeyPair,
        partialSignature,
        userSalt,
        decodedJwt
      );
      
      if (txResult.digest) {
        // 8. 记录续订到后端
        const renewResponse = await api.post<SubscriptionResponse>(
          API_ENDPOINTS.SUBSCRIPTION.RENEW,
          {
            subscription_id: request.subscription_id,
            tx_hash: txResult.digest
          }
        );
        
        if (renewResponse.success && renewResponse.data?.subscription) {
          return {
            success: true,
            subscription: renewResponse.data.subscription,
            tx_hash: txResult.digest
          };
        } else {
          return {
            success: false,
            error: `续订记录创建失败: ${renewResponse.error?.message || '未知错误'}`
          };
        }
      } else {
        return {
          success: false,
          error: "交易执行失败"
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `订阅续订失败: ${error.message}`
      };
    }
  }
  
  // 取消订阅
  async cancelSubscription(
    request: CancelSubscriptionRequest,
    zkLoginAddress: string,
    ephemeralKeyPair: Ed25519Keypair,
    partialSignature: PartialZkLoginSignature,
    userSalt: string,
    decodedJwt: any
  ): Promise<CancelSubscriptionResponse> {
    try {
      // 创建交易
      const txb = new Transaction();
      txb.setSender(zkLoginAddress);
      
      // 1. 获取订阅详情
      const response = await api.get<ApiResponse>(API_ENDPOINTS.SUBSCRIPTION.STATUS);
      
      // 确保数据结构正确
      if (!response.success) {
        throw new Error(`获取订阅详情失败: ${response.error?.message || '未知错误'}`);
      }
      
      // 将返回数据转换为标准格式
      const subscriptionsData = response.data as SubscriptionsResponse;
      if (!subscriptionsData.subscriptions || !Array.isArray(subscriptionsData.subscriptions)) {
        throw new Error('获取订阅详情失败: 返回数据格式不正确');
      }
      
      // 从返回的订阅列表中找到目标订阅
      const subscription = subscriptionsData.subscriptions.find(
        (sub: Subscription) => sub.id === request.subscription_id
      );
      
      if (!subscription) {
        throw new Error('未找到指定的订阅');
      }
      
      // 2. 检查合约对象ID是否存在
      if (!subscription.contract_object_id) {
        throw new Error('订阅合约对象ID不存在，无法取消');
      }
      
      // 3. 调用cancel_subscription方法
      txb.moveCall({
        target: `${CONTRACT_ADDRESSES.SUBSCRIPTION.PACKAGE_ID}::subscription::cancel_subscription`,
        arguments: [
          txb.object(subscription.contract_object_id),
          txb.object(CONTRACT_ADDRESSES.AUTHENTICATION.REGISTRY_OBJECT_ID)
        ]
      });
      
      // 4. 执行交易
      const txResult = await this.executeZkLoginTransaction(
        txb,
        zkLoginAddress,
        ephemeralKeyPair,
        partialSignature,
        userSalt,
        decodedJwt
      );
      
      // 5. 处理交易结果
      if (txResult.digest) {
        // 记录取消到后端
        const cancelResponse = await api.post<ApiResponse>(
          API_ENDPOINTS.SUBSCRIPTION.CANCEL,
          {
            subscription_id: request.subscription_id,
            tx_hash: txResult.digest
          }
        );
        
        return {
          success: cancelResponse.success,
          error: cancelResponse.success ? undefined : 
            `取消订阅记录失败: ${cancelResponse.error?.message || '未知错误'}`
        };
      } else {
        return {
          success: false,
          error: "交易执行失败"
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `取消订阅失败: ${error.message || '未知异常'}`
      };
    }
  }
  
  // 切换自动续订状态
  async toggleAutoRenew(
    request: ToggleAutoRenewRequest
  ): Promise<ToggleAutoRenewResponse> {
    try {
      const response = await api.post<SubscriptionResponse>(API_ENDPOINTS.SUBSCRIPTION.AUTO_RENEW, request);
      
      if (response.success && response.data?.subscription) {
        return {
          success: true,
          subscription: response.data.subscription
        };
      } else {
        return {
          success: false,
          error: response.error?.message || '切换自动续订状态失败'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `切换自动续订状态过程中发生错误: ${error.message || '未知异常'}`
      };
    }
  }
  
  // 获取订阅状态
  async getSubscriptionStatus(): Promise<SubscriptionStatusResponse> {
    try {
      const response = await api.get<SubscriptionsResponse>(API_ENDPOINTS.SUBSCRIPTION.STATUS);
      
      if (response.success) {
        return {
          success: true,
          subscriptions: response.data?.subscriptions || [],
          active_subscription: response.data?.active_subscription || undefined
        };
      } else {
        return {
          success: false,
          error: response.error?.message || '获取订阅状态失败'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `获取订阅状态失败: ${error.message || '未知异常'}`
      };
    }
  }
  
  // 获取订阅计划列表
  async getSubscriptionPlans(): Promise<{success: boolean, plans?: any[], error?: string}> {
    try {
      const response = await api.get<PlansResponse>(API_ENDPOINTS.SUBSCRIPTION.PLANS);
      
      if (response.success) {
        return {
          success: true,
          plans: response.data?.plans || []
        };
      } else {
        return {
          success: false,
          error: response.error?.message || '获取订阅计划失败'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `获取订阅计划失败: ${error.message || '未知异常'}`
      };
    }
  }
} 