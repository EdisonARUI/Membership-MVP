-- 删除现有表和视图（如果存在）
DROP VIEW IF EXISTS user_subscription_status;
DROP TABLE IF EXISTS user_subscriptions CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;

-- 重新创建订阅计划表
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  price decimal NOT NULL,
  period text NOT NULL, -- 'monthly', 'quarterly', 'yearly'
  description text,
  features jsonb NOT NULL,
  is_popular boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 创建用户订阅表
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id),
  plan_id uuid REFERENCES subscription_plans(id) NOT NULL,
  wallet_id uuid, -- 可以稍后添加外键引用
  contract_object_id text, -- 存储合约中的订阅对象ID
  status text NOT NULL, -- 'active', 'canceled', 'expired'
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  auto_renew boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 创建订阅状态视图
CREATE OR REPLACE VIEW user_subscription_status AS
SELECT 
  us.id,
  us.user_id,
  us.contract_object_id,
  sp.name AS plan_name,
  sp.period AS plan_period,
  us.start_date,
  us.end_date,
  us.status,
  us.auto_renew,
  now() < us.end_date AND us.status = 'active' AS is_active
FROM 
  user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id;

-- 订阅过期检查和更新的函数
CREATE OR REPLACE FUNCTION check_subscription_expiry() 
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.end_date < now() AND NEW.status = 'active' THEN
    NEW.status := 'expired';
  END IF;
  RETURN NEW;
END;
$$;

-- 创建触发器来检查订阅是否已过期
CREATE TRIGGER update_subscription_status
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION check_subscription_expiry();

-- 预填充订阅计划
INSERT INTO subscription_plans (name, price, period, features, is_popular)
VALUES 
  ('monthly', 35, 'monthly', '["Basic"]'::jsonb, false),
  ('quarterly', 99, 'quarterly', '["Premium"]'::jsonb, true),
  ('yearly', 365, 'yearly', '["Enterprise"]'::jsonb, false)
ON CONFLICT DO NOTHING;

-- 插入一个固定ID的测试数据，便于测试
INSERT INTO subscription_plans (id, name, price, period, features, is_popular)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'test', 1, 'monthly', '["test"]'::jsonb, false)
ON CONFLICT DO NOTHING;

-- 手动创建一条测试订阅记录
INSERT INTO user_subscriptions (
  user_id, 
  plan_id, 
  status, 
  start_date, 
  end_date
)
VALUES (
  NULL, -- 如果在无会话环境下，使用NULL
  '00000000-0000-0000-0000-000000000001', -- 使用固定ID
  'active', 
  now(), 
  now() + interval '1 month'
);

-- 添加一条排障查询语句（用于测试）
SELECT * FROM subscription_plans; 