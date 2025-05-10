/**
 * Database Initialization Script
 * 
 * This script creates the core tables for the application:
 * - user_wallets: Stores user wallet information
 * - subscription_plans: Defines available subscription plans
 * - user_subscriptions: Tracks user subscription status
 * - payment_transactions: Records payment history
 */

-- Create user wallets table
create table if not exists user_wallets (
  id uuid primary key default uuid_generate_v4(),  -- Unique identifier for each wallet
  user_id uuid references auth.users(id) not null, -- Reference to auth.users table
  wallet_address text not null,                    -- User's wallet address
  wallet_type text not null,                       -- Type of wallet (e.g., 'zklogin', 'sui')
  created_at timestamptz default now(),            -- Record creation timestamp
  updated_at timestamptz default now(),            -- Record last update timestamp
  unique(user_id, wallet_type)                     -- Ensure one wallet type per user
);

-- Create subscription plans table
create table if not exists subscription_plans (
  id uuid primary key default uuid_generate_v4(),  -- Unique identifier for each plan
  name text not null,                              -- Plan name
  price decimal not null,                          -- Plan price
  period text not null,                            -- Billing period ('monthly', 'quarterly', 'yearly')
  description text,                                -- Plan description
  features jsonb not null,                         -- Plan features as JSON
  is_popular boolean default false,                -- Flag for popular plans
  created_at timestamptz default now(),            -- Record creation timestamp
  updated_at timestamptz default now()             -- Record last update timestamp
);

-- Create user subscriptions table
create table if not exists user_subscriptions (
  id uuid primary key default uuid_generate_v4(),  -- Unique identifier for each subscription
  user_id uuid references auth.users(id) not null, -- Reference to auth.users table
  plan_id uuid references subscription_plans(id) not null, -- Reference to subscription plan
  wallet_id uuid references user_wallets(id),      -- Reference to user's wallet
  contract_object_id text,                         -- Contract object ID in blockchain
  status text not null,                            -- Subscription status ('active', 'canceled', 'expired')
  start_date timestamptz not null,                 -- Subscription start date
  end_date timestamptz not null,                   -- Subscription end date
  auto_renew boolean default true,                 -- Auto-renewal flag
  created_at timestamptz default now(),            -- Record creation timestamp
  updated_at timestamptz default now()             -- Record last update timestamp
);

-- Create payment transactions table
create table if not exists payment_transactions (
  id uuid primary key default uuid_generate_v4(),  -- Unique identifier for each transaction
  user_id uuid references auth.users(id) not null, -- Reference to auth.users table
  subscription_id uuid references user_subscriptions(id), -- Reference to subscription
  amount decimal not null,                         -- Transaction amount
  currency text not null default 'CNY',            -- Currency code
  status text not null,                            -- Transaction status ('pending', 'completed', 'failed')
  transaction_hash text,                           -- Blockchain transaction hash
  payment_method text not null,                    -- Payment method ('crypto', 'wechat', 'alipay')
  created_at timestamptz default now()             -- Record creation timestamp
);

-- Pre-populate subscription plans
insert into subscription_plans (name, price, period, features, is_popular)
values 
  ('Monthly', 35, 'monthly', '["Basic Analytics Dashboard", "Up to 5 Team Members", "2GB Storage", "Email Support"]'::jsonb, false),
  ('Quarterly', 99, 'quarterly', '["Advanced Analytics", "Up to 15 Team Members", "10GB Storage", "Priority Email Support", "API Access"]'::jsonb, true),
  ('Yearly', 365, 'yearly', '["Enterprise Analytics", "Unlimited Team Members", "50GB Storage", "24/7 Priority Support", "API Access", "Custom Integration"]'::jsonb, false)
on conflict do nothing;

-- Enable Row Level Security (RLS)
alter table user_wallets enable row level security;
alter table subscription_plans enable row level security;
alter table user_subscriptions enable row level security;
alter table payment_transactions enable row level security;

-- RLS Policies for user_wallets table
create policy "Users can only view their own wallets"
  on user_wallets for select
  using (auth.uid() = user_id);

create policy "Users can only create their own wallets"
  on user_wallets for insert
  with check (auth.uid() = user_id);

create policy "Users can only update their own wallets"
  on user_wallets for update
  using (auth.uid() = user_id);

-- RLS Policies for subscription_plans table
create policy "All authenticated users can view subscription plans"
  on subscription_plans for select
  using (auth.role() = 'authenticated');

-- RLS Policies for user_subscriptions table
create policy "Users can only view their own subscriptions"
  on user_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can only create their own subscriptions"
  on user_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can only update their own subscriptions"
  on user_subscriptions for update
  using (auth.uid() = user_id);

-- RLS Policies for payment_transactions table
create policy "Users can only view their own payment transactions"
  on payment_transactions for select
  using (auth.uid() = user_id);

create policy "Users can only create their own payment transactions"
  on payment_transactions for insert
  with check (auth.uid() = user_id);

-- Create view for subscription status
create or replace view user_subscription_status as
select 
  us.id,
  us.user_id,
  us.contract_object_id,
  sp.name as plan_name,
  sp.period as plan_period,
  us.start_date,
  us.end_date,
  us.status,
  us.auto_renew,
  now() < us.end_date and us.status = 'active' as is_active
from 
  user_subscriptions us
  join subscription_plans sp on us.plan_id = sp.id;

-- Function to check subscription expiry
create or replace function check_subscription_expiry() returns trigger as $$
begin
  if new.end_date < now() and new.status = 'active' then
    new.status := 'expired';
  end if;
  return new;
end;
$$ language plpgsql;

-- Create trigger for subscription expiry check
create trigger update_subscription_status
  before update on user_subscriptions
  for each row
  execute function check_subscription_expiry();