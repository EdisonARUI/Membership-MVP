/**
 * Interfaces for Subscription functionality
 * These interfaces define the contract between frontend and backend for subscription operations
 */

/**
 * Subscription plan details
 */
export interface SubscriptionPlan {
  /**
   * Unique identifier for the plan
   */
  id: string;
  
  /**
   * Display name of the subscription plan
   */
  name: string;
  
  /**
   * Price of the subscription in standard currency units
   */
  price: number;
  
  /**
   * Billing period for the subscription
   */
  period: 'monthly' | 'quarterly' | 'yearly';
  
  /**
   * List of features included in this plan
   */
  features: string[];
  
  /**
   * Whether this plan should be highlighted as popular
   */
  is_popular?: boolean;
}

/**
 * User subscription details
 */
export interface Subscription {
  /**
   * Unique identifier for the subscription
   */
  id: string;
  
  /**
   * User identifier who owns this subscription
   */
  user_id: string;
  
  /**
   * Identifier of the subscription plan
   */
  plan_id: string;
  
  /**
   * Name of the subscription plan
   */
  plan_name: string;
  
  /**
   * Billing period of the subscription
   */
  plan_period: string;
  
  /**
   * Current status of the subscription
   */
  status: 'active' | 'canceled' | 'expired';
  
  /**
   * Date when the subscription started
   */
  start_date: string;
  
  /**
   * Date when the subscription will end
   */
  end_date: string;
  
  /**
   * Whether the subscription should automatically renew
   */
  auto_renew: boolean;
  
  /**
   * Whether the subscription is currently active
   */
  is_active: boolean;
  
  /**
   * Blockchain object ID for the subscription contract
   */
  contract_object_id?: string;
}

/**
 * Base API response interface
 */
export interface ApiResponse {
  /**
   * Whether the request was successful
   */
  success: boolean;
  
  /**
   * Error message if request failed
   */
  error?: string;
}

/**
 * Response for fetching subscription plans
 */
export interface PlansResponse extends ApiResponse {
  /**
   * List of available subscription plans
   */
  plans?: SubscriptionPlan[];
}

/**
 * Response for fetching a single subscription plan
 */
export interface PlanResponse extends ApiResponse {
  /**
   * Details of the requested plan
   */
  plan?: SubscriptionPlan;  
}

/**
 * Response for subscription operations (create, update, fetch)
 */
export interface SubscriptionResponse extends ApiResponse {
  /**
   * Subscription details
   */
  subscription?: Subscription;
  
  /**
   * Transaction hash for blockchain operations
   */
  tx_hash?: string;
}

/**
 * Response for fetching multiple subscriptions
 */
export interface SubscriptionsResponse extends ApiResponse {
  /**
   * List of user subscriptions
   */
  subscriptions?: Subscription[];
  
  /**
   * Currently active subscription if any
   */
  active_subscription?: Subscription;
}

/**
 * Request parameters for creating a subscription
 */
export interface CreateSubscriptionRequest {
  /**
   * ID of the plan to subscribe to
   */
  plan_id: string;
  
  /**
   * Whether the subscription should automatically renew
   */
  auto_renew: boolean;
}

/**
 * Response for subscription creation operation
 */
export interface CreateSubscriptionResponse {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Created subscription details
   */
  subscription?: Subscription;
  
  /**
   * Transaction hash for the blockchain operation
   */
  tx_hash?: string;
  
  /**
   * Error message if operation failed
   */
  error?: string;
}

/**
 * Request parameters for renewing a subscription
 */
export interface RenewSubscriptionRequest {
  /**
   * ID of the subscription to renew
   */
  subscription_id: string;
}

/**
 * Response for subscription renewal operation
 */
export interface RenewSubscriptionResponse {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Updated subscription details
   */
  subscription?: Subscription;
  
  /**
   * Transaction hash for the blockchain operation
   */
  tx_hash?: string;
  
  /**
   * Error message if operation failed
   */
  error?: string;
}

/**
 * Request parameters for canceling a subscription
 */
export interface CancelSubscriptionRequest {
  /**
   * ID of the subscription to cancel
   */
  subscription_id: string;
}

/**
 * Response for subscription cancellation operation
 */
export interface CancelSubscriptionResponse {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Error message if operation failed
   */
  error?: string;
}

/**
 * Response for fetching user subscription status
 */
export interface SubscriptionStatusResponse {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * List of user subscriptions
   */
  subscriptions?: Subscription[];
  
  /**
   * Currently active subscription if any
   */
  active_subscription?: Subscription;
  
  /**
   * Error message if operation failed
   */
  error?: string;
}

/**
 * Request parameters for toggling auto-renewal
 */
export interface ToggleAutoRenewRequest {
  /**
   * ID of the subscription to update
   */
  subscription_id: string;
  
  /**
   * New auto-renew setting
   */
  auto_renew: boolean;
}

/**
 * Response for toggling auto-renewal operation
 */
export interface ToggleAutoRenewResponse {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Updated subscription details
   */
  subscription?: Subscription;
  
  /**
   * Error message if operation failed
   */
  error?: string;
} 