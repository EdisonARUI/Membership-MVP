export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  period: 'monthly' | 'quarterly' | 'yearly';
  features: string[];
  is_popular?: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  plan_name: string;
  plan_period: string;
  status: 'active' | 'canceled' | 'expired';
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  is_active: boolean;
  contract_object_id?: string;
}

// API响应接口
export interface ApiResponse {
  success: boolean;
  error?: string;
}

export interface PlansResponse extends ApiResponse {
  plans?: SubscriptionPlan[];
}

export interface PlanResponse extends ApiResponse {
  plan?: SubscriptionPlan;  
}

export interface SubscriptionResponse extends ApiResponse {
  subscription?: Subscription;
  tx_hash?: string;
}

export interface SubscriptionsResponse extends ApiResponse {
  subscriptions?: Subscription[];
  active_subscription?: Subscription;
}

export interface CreateSubscriptionRequest {
  plan_id: string;
  auto_renew: boolean;
}

export interface CreateSubscriptionResponse {
  success: boolean;
  subscription?: Subscription;
  tx_hash?: string;
  error?: string;
}

export interface RenewSubscriptionRequest {
  subscription_id: string;
}

export interface RenewSubscriptionResponse {
  success: boolean;
  subscription?: Subscription;
  tx_hash?: string;
  error?: string;
}

export interface CancelSubscriptionRequest {
  subscription_id: string;
}

export interface CancelSubscriptionResponse {
  success: boolean;
  error?: string;
}

export interface SubscriptionStatusResponse {
  success: boolean;
  subscriptions?: Subscription[];
  active_subscription?: Subscription;
  error?: string;
}

export interface ToggleAutoRenewRequest {
  subscription_id: string;
  auto_renew: boolean;
}

export interface ToggleAutoRenewResponse {
  success: boolean;
  subscription?: Subscription;
  error?: string;
} 