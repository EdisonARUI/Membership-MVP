-- 创建钱包地址表
create table if not exists user_wallets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  wallet_address text not null,
  wallet_type text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, wallet_type)
);

-- 创建订阅计划表
create table if not exists subscription_plans (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  price decimal not null,
  period text not null, -- 'monthly', 'quarterly', 'yearly'
  description text,
  features jsonb not null,
  is_popular boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 创建用户订阅表
create table if not exists user_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  plan_id uuid references subscription_plans(id) not null,
  wallet_id uuid references user_wallets(id),
  contract_object_id text, -- 存储合约中的订阅对象ID
  status text not null, -- 'active', 'canceled', 'expired'
  start_date timestamptz not null,
  end_date timestamptz not null,
  auto_renew boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 创建支付记录表
create table if not exists payment_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  subscription_id uuid references user_subscriptions(id),
  amount decimal not null,
  currency text not null default 'CNY',
  status text not null, -- 'pending', 'completed', 'failed'
  transaction_hash text, -- 加密货币交易哈希
  payment_method text not null, -- 'crypto', 'wechat', 'alipay'
  created_at timestamptz default now()
);

-- 预填充订阅计划
insert into subscription_plans (name, price, period, features, is_popular)
values 
  ('月付', 35, 'monthly', '["基础分析仪表盘", "最多5名团队成员", "2GB存储空间", "邮件支持"]'::jsonb, false),
  ('季付', 99, 'quarterly', '["高级分析功能", "最多15名团队成员", "10GB存储空间", "优先邮件支持", "API访问权限"]'::jsonb, true),
  ('年付', 365, 'yearly', '["企业级分析", "无限团队成员", "50GB存储空间", "24/7优先支持", "API访问权限", "自定义集成"]'::jsonb, false)
on conflict do nothing;

-- 启用RLS策略
alter table user_wallets enable row level security;
alter table subscription_plans enable row level security;
alter table user_subscriptions enable row level security;
alter table payment_transactions enable row level security;

-- 用户钱包表的RLS策略
create policy "用户只能查看自己的钱包"
  on user_wallets for select
  using (auth.uid() = user_id);

create policy "用户只能创建自己的钱包"
  on user_wallets for insert
  with check (auth.uid() = user_id);

create policy "用户只能更新自己的钱包"
  on user_wallets for update
  using (auth.uid() = user_id);

-- 订阅计划表的RLS策略（所有已认证用户可查看，但只有管理员可修改）
create policy "所有已登录用户可查看订阅计划"
  on subscription_plans for select
  using (auth.role() = 'authenticated');

-- 用户订阅表的RLS策略
create policy "用户只能查看自己的订阅"
  on user_subscriptions for select
  using (auth.uid() = user_id);

create policy "用户只能创建自己的订阅"
  on user_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "用户只能更新自己的订阅"
  on user_subscriptions for update
  using (auth.uid() = user_id);

-- 支付记录表的RLS策略
create policy "用户只能查看自己的支付记录"
  on payment_transactions for select
  using (auth.uid() = user_id);

create policy "用户只能创建自己的支付记录"
  on payment_transactions for insert
  with check (auth.uid() = user_id);

-- 创建一个视图来获取订阅状态（包括是否有效）
-- 注意：视图会继承基础表的RLS安全性，不需要单独为视图启用RLS
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

-- 订阅过期检查和更新的函数
create or replace function check_subscription_expiry() returns trigger as $$
begin
  if new.end_date < now() and new.status = 'active' then
    new.status := 'expired';
  end if;
  return new;
end;
$$ language plpgsql;

-- 创建触发器来检查订阅是否已过期
create trigger update_subscription_status
  before update on user_subscriptions
  for each row
  execute function check_subscription_expiry();