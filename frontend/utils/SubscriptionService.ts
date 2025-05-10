/**
 * Service for managing subscription operations on the SUI blockchain
 * Provides methods for creating, renewing, and managing subscription plans
 */
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

/**
 * Service for managing subscription functionality
 * Provides methods for creating, renewing, canceling and managing subscriptions
 */
export class SubscriptionService {
  private client: SuiClient;
  private zkLoginTransactions: ReturnType<typeof useZkLoginTransactions>;

  /**
   * Creates a new instance of SubscriptionService
   * Initializes SUI client and zkLogin transaction utilities
   */
  constructor() {
    this.client = new SuiClient({ url: FULLNODE_URL });
    this.zkLoginTransactions = useZkLoginTransactions();
  }

  /**
   * Retrieves subscription plan details
   * 
   * @param {string} planId - ID of the subscription plan to retrieve
   * @returns {Promise<SubscriptionPlan>} The subscription plan details
   * @throws {Error} If plan retrieval fails or plan data is invalid
   * @private
   */
  private async getSubscriptionPlan(planId: string): Promise<SubscriptionPlan> {
    const queryParams = new URLSearchParams();
    queryParams.append('plan_id', planId);
    const url = `${API_ENDPOINTS.SUBSCRIPTION.PLANS}?${queryParams.toString()}`;
    const planResponse = await api.get<PlanResponse>(url);
    
    if (!planResponse.success || !planResponse.data?.plan) {
      throw new Error(`Failed to retrieve plan details: ${planResponse.error?.message || 'Unknown error'}, Request parameters: plan_id=${planId}`);
    }
    
    const plan = planResponse.data.plan;
    
    // Validate plan information completeness
    if (!plan.id || !plan.name || !plan.period || typeof plan.price !== 'number') {
      throw new Error(`Plan information incomplete or invalid format: ${JSON.stringify(plan)}`);
    }
    
    return plan;
  }
  
  /**
   * Calculates subscription duration in milliseconds based on period
   * 
   * @param {string} period - Subscription period ('monthly', 'quarterly', 'yearly')
   * @returns {number} Duration in milliseconds
   * @throws {Error} If period is unknown
   * @private
   */
  private calculateDuration(period: string): number {
    switch (period) {
      case 'monthly':
        return 30 * 24 * 60 * 60 * 1000; // 30 days
      case 'quarterly':
        return 90 * 24 * 60 * 60 * 1000; // 90 days
      case 'yearly':
        return 365 * 24 * 60 * 60 * 1000; // 365 days
      default:
        throw new Error(`Unknown subscription period: ${period}`);
    }
  }
  
  /**
   * Prepares payment coin for subscription transaction
   * Finds and splits user's tokens for payment
   * 
   * @param {Transaction} txb - Transaction block to add payment to
   * @param {string} zkLoginAddress - User's zkLogin address
   * @param {bigint} paymentAmount - Payment amount in token units
   * @returns {Promise<any>} The payment coin object
   * @throws {Error} If user has insufficient funds
   * @private
   */
  private async preparePaymentCoin(
    txb: Transaction, 
    zkLoginAddress: string, 
    paymentAmount: bigint
  ): Promise<any> {
    // Get user's TEST_USDT token objects
    const coinData = await this.client.getCoins({
      owner: zkLoginAddress,
      coinType: TOKENS.TEST_USDT.coinType || ''
    });
    
    if (!coinData || !coinData.data || coinData.data.length === 0) {
      throw new Error(`${TOKENS.TEST_USDT.symbol} token not found`);
    }
    
    const coinObjects = coinData.data;
    
    // Use precision conversion function for balance display
    const totalBalance = coinObjects.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));
    if (totalBalance < paymentAmount) {
      throw new Error(`Insufficient balance, need ${fromTokenAmount(paymentAmount, TOKENS.TEST_USDT)} ${TOKENS.TEST_USDT.symbol}, available ${fromTokenAmount(totalBalance, TOKENS.TEST_USDT)} ${TOKENS.TEST_USDT.symbol}`);
    }
    
    // Select a token object large enough to split
    const coinToSplit = coinObjects.find(coin => BigInt(coin.balance) >= paymentAmount);
    if (!coinToSplit || !coinToSplit.coinObjectId) {
      throw new Error(`No token object large enough found, need ${fromTokenAmount(paymentAmount, TOKENS.TEST_USDT)} ${TOKENS.TEST_USDT.symbol}`);
    }

    // Correctly use splitCoins - returns an array of new split coins
    const [paymentCoin] = txb.splitCoins(txb.object(coinToSplit.coinObjectId), [paymentAmount]);
    return paymentCoin;
  }
  
  /**
   * Executes a zkLogin transaction
   * Signs and submits transaction to the blockchain
   * 
   * @param {Transaction} txb - Transaction to execute
   * @param {string} zkLoginAddress - User's zkLogin address
   * @param {Ed25519Keypair} ephemeralKeyPair - Ephemeral keypair for signing
   * @param {PartialZkLoginSignature} partialSignature - Partial zkLogin signature
   * @param {string} userSalt - User's salt value
   * @param {any} decodedJwt - Decoded JWT information
   * @returns {Promise<any>} Transaction execution result
   * @private
   */
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
  
  /**
   * Extracts object ID from transaction events
   * 
   * @param {any[] | null | undefined} events - Transaction events to search
   * @param {string} eventType - Type of event to look for
   * @returns {string | null} Object ID if found, null otherwise
   * @private
   */
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

  /**
   * Creates a new subscription
   * Processes payment and calls the subscription contract
   * 
   * @param {CreateSubscriptionRequest} request - Subscription creation parameters
   * @param {string} zkLoginAddress - User's zkLogin address
   * @param {Ed25519Keypair} ephemeralKeyPair - Ephemeral keypair for signing
   * @param {PartialZkLoginSignature} partialSignature - Partial zkLogin signature
   * @param {string} userSalt - User's salt value
   * @param {any} decodedJwt - Decoded JWT information
   * @returns {Promise<CreateSubscriptionResponse>} Result of subscription creation
   */
  async createSubscription(
    request: CreateSubscriptionRequest,
    zkLoginAddress: string,
    ephemeralKeyPair: Ed25519Keypair,
    partialSignature: PartialZkLoginSignature,
    userSalt: string,
    decodedJwt: any
  ): Promise<CreateSubscriptionResponse> {
    try {
      // Create transaction
      const txb = new Transaction();
      txb.setSender(zkLoginAddress);
      
      // 1. Get subscription plan details
      const plan = await this.getSubscriptionPlan(request.plan_id);
      
      // 2. Calculate subscription duration (milliseconds)
      const duration = this.calculateDuration(plan.period);
      
      // 3. Get payment amount
      const paymentAmount = toTokenAmount(plan.price, TOKENS.TEST_USDT);
      
      // 4. Prepare payment token
      const paymentCoin = await this.preparePaymentCoin(txb, zkLoginAddress, BigInt(paymentAmount));
      
      try {
        // 5. Call create_subscription method
        txb.moveCall({
          target: `${CONTRACT_ADDRESSES.SUBSCRIPTION.PACKAGE_ID}::subscription::create_subscription`,
          arguments: [
            paymentCoin, // Split token as payment
            txb.pure.u64(duration),
            txb.pure.bool(request.auto_renew),
            txb.object(COMMON_CONTRACT.CLOCK),
            txb.object(CONTRACT_ADDRESSES.AUTHENTICATION.REGISTRY_OBJECT_ID),
            txb.object(CONTRACT_ADDRESSES.FUND.FUND_OBJECT_ID)
          ]
        });
      } catch (moveCallError: any) {
        const args = {
          splitCoin: paymentCoin ? 'defined' : 'undefined',
          duration, 
          auto_renew: request.auto_renew,
          clock: COMMON_CONTRACT.CLOCK,
          auth_registry: CONTRACT_ADDRESSES.AUTHENTICATION.REGISTRY_OBJECT_ID,
          fund: CONTRACT_ADDRESSES.FUND.FUND_OBJECT_ID
        };
        throw new Error(`Failed to call create_subscription: ${moveCallError.message}, params=${JSON.stringify(args)}`);
      }
      
      // 6. Execute transaction
      const txResult = await this.executeZkLoginTransaction(
        txb,
        zkLoginAddress,
        ephemeralKeyPair,
        partialSignature,
        userSalt,
        decodedJwt
      );

      if (txResult.digest) {
        // 7. Extract created subscription object ID from transaction results
        const contractObjectId = this.extractObjectIdFromEvents(txResult.events, 'SubscriptionCreatedEvent');
        
        // 8. Record subscription to backend
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
            error: `Failed to create subscription record: ${createResponse.error?.message || 'Unknown error'}`
          };
        }
      } else {
        return {
          success: false,
          error: "Transaction execution failed",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to create subscription: ${error.message}`
      };
    }
  }
  
  /**
   * Renews an existing subscription
   * Processes payment for the next period and extends subscription duration
   * 
   * @param {RenewSubscriptionRequest} request - Subscription renewal parameters
   * @param {string} zkLoginAddress - User's zkLogin address
   * @param {Ed25519Keypair} ephemeralKeyPair - Ephemeral keypair for signing
   * @param {PartialZkLoginSignature} partialSignature - Partial zkLogin signature
   * @param {string} userSalt - User's salt value
   * @param {any} decodedJwt - Decoded JWT information
   * @returns {Promise<RenewSubscriptionResponse>} Result of subscription renewal
   */
  async renewSubscription(
    request: RenewSubscriptionRequest,
    zkLoginAddress: string,
    ephemeralKeyPair: Ed25519Keypair,
    partialSignature: PartialZkLoginSignature,
    userSalt: string,
    decodedJwt: any
  ): Promise<RenewSubscriptionResponse> {
    try {
      // Create transaction
      const txb = new Transaction();
      txb.setSender(zkLoginAddress);
      
      // 1. Get subscription details
      const queryParams = new URLSearchParams();
      queryParams.append('subscription_id', request.subscription_id);
      const subscriptionResponse = await api.get<SubscriptionResponse>(
        `${API_ENDPOINTS.SUBSCRIPTION.STATUS}?${queryParams.toString()}`
      );
      
      if (!subscriptionResponse.success || !subscriptionResponse.data?.subscription) {
        throw new Error(`Failed to retrieve subscription details: ${subscriptionResponse.error?.message || 'Unknown error'}`);
      }
      
      const subscription = subscriptionResponse.data.subscription;
      
      // 2. Check if contract object ID exists
      if (!subscription.contract_object_id) {
        throw new Error('Subscription contract object ID does not exist, cannot renew');
      }
      
      // 3. Get plan details
      const plan = await this.getSubscriptionPlan(subscription.plan_id);
      
      // 4. Get payment amount
      const paymentAmount = toTokenAmount(plan.price, TOKENS.TEST_USDT);
      
      // 5. Prepare payment token
      const paymentCoin = await this.preparePaymentCoin(txb, zkLoginAddress, BigInt(paymentAmount));
      
      // 6. Call renew_subscription method
      txb.moveCall({
        target: `${CONTRACT_ADDRESSES.SUBSCRIPTION.PACKAGE_ID}::subscription::renew_subscription`,
        arguments: [
          txb.object(subscription.contract_object_id), // Subscription object ID
          paymentCoin, // Split token as payment
          txb.object(COMMON_CONTRACT.CLOCK),
          txb.object(CONTRACT_ADDRESSES.AUTHENTICATION.REGISTRY_OBJECT_ID),
          txb.object(CONTRACT_ADDRESSES.FUND.FUND_OBJECT_ID)
        ]
      });
      
      // 7. Execute transaction
      const txResult = await this.executeZkLoginTransaction(
        txb,
        zkLoginAddress,
        ephemeralKeyPair,
        partialSignature,
        userSalt,
        decodedJwt
      );
      
      if (txResult.digest) {
        // 8. Record renewal to backend
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
            error: `Failed to create renewal record: ${renewResponse.error?.message || 'Unknown error'}`
          };
        }
      } else {
        return {
          success: false,
          error: "Transaction execution failed"
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Subscription renewal failed: ${error.message}`
      };
    }
  }
  
  /**
   * Cancels an active subscription
   * Calls the contract's cancel_subscription method
   * 
   * @param {CancelSubscriptionRequest} request - Subscription cancellation parameters
   * @param {string} zkLoginAddress - User's zkLogin address
   * @param {Ed25519Keypair} ephemeralKeyPair - Ephemeral keypair for signing
   * @param {PartialZkLoginSignature} partialSignature - Partial zkLogin signature
   * @param {string} userSalt - User's salt value
   * @param {any} decodedJwt - Decoded JWT information
   * @returns {Promise<CancelSubscriptionResponse>} Result of subscription cancellation
   */
  async cancelSubscription(
    request: CancelSubscriptionRequest,
    zkLoginAddress: string,
    ephemeralKeyPair: Ed25519Keypair,
    partialSignature: PartialZkLoginSignature,
    userSalt: string,
    decodedJwt: any
  ): Promise<CancelSubscriptionResponse> {
    try {
      // Create transaction
      const txb = new Transaction();
      txb.setSender(zkLoginAddress);
      
      // 1. Get subscription details
      const response = await api.get<ApiResponse>(API_ENDPOINTS.SUBSCRIPTION.STATUS);
      
      // Ensure data structure is correct
      if (!response.success) {
        throw new Error(`Failed to retrieve subscription details: ${response.error?.message || 'Unknown error'}`);
      }
      
      // Convert return data to standard format
      const subscriptionsData = response.data as SubscriptionsResponse;
      if (!subscriptionsData.subscriptions || !Array.isArray(subscriptionsData.subscriptions)) {
        throw new Error('Failed to retrieve subscription details: Invalid response format');
      }
      
      // Find target subscription from returned list
      const subscription = subscriptionsData.subscriptions.find(
        (sub: Subscription) => sub.id === request.subscription_id
      );
      
      if (!subscription) {
        throw new Error('Subscription not found');
      }
      
      // 2. Check if contract object ID exists
      if (!subscription.contract_object_id) {
        throw new Error('Subscription contract object ID does not exist, cannot cancel');
      }
      
      // 3. Call cancel_subscription method
      txb.moveCall({
        target: `${CONTRACT_ADDRESSES.SUBSCRIPTION.PACKAGE_ID}::subscription::cancel_subscription`,
        arguments: [
          txb.object(subscription.contract_object_id),
          txb.object(CONTRACT_ADDRESSES.AUTHENTICATION.REGISTRY_OBJECT_ID)
        ]
      });
      
      // 4. Execute transaction
      const txResult = await this.executeZkLoginTransaction(
        txb,
        zkLoginAddress,
        ephemeralKeyPair,
        partialSignature,
        userSalt,
        decodedJwt
      );
      
      // 5. Process transaction result
      if (txResult.digest) {
        // Record cancellation to backend
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
            `Failed to record subscription cancellation: ${cancelResponse.error?.message || 'Unknown error'}`
        };
      } else {
        return {
          success: false,
          error: "Transaction execution failed"
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to cancel subscription: ${error.message || 'Unknown exception'}`
      };
    }
  }
  
  /**
   * Toggles auto-renewal setting for a subscription
   * 
   * @param {ToggleAutoRenewRequest} request - Auto-renew toggle parameters
   * @returns {Promise<ToggleAutoRenewResponse>} Result of toggle operation
   */
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
          error: response.error?.message || 'Failed to toggle auto-renewal status'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Error during auto-renewal toggle process: ${error.message || 'Unknown exception'}`
      };
    }
  }
  
  /**
   * Retrieves current subscription status for the user
   * 
   * @returns {Promise<SubscriptionStatusResponse>} Current subscription status
   */
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
          error: response.error?.message || 'Failed to retrieve subscription status'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to retrieve subscription status: ${error.message || 'Unknown exception'}`
      };
    }
  }
  
  /**
   * Retrieves available subscription plans
   * 
   * @returns {Promise<{success: boolean, plans?: any[], error?: string}>} List of subscription plans
   */
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
          error: response.error?.message || 'Failed to retrieve subscription plans'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to retrieve subscription plans: ${error.message || 'Unknown exception'}`
      };
    }
  }
} 