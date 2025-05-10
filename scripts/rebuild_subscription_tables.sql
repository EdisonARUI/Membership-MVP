/**
 * Subscription Tables Rebuild Script
 * 
 * This script rebuilds the subscription-related tables and views from scratch.
 * It includes:
 * - Dropping existing tables and views
 * - Creating new tables with proper structure
 * - Setting up triggers and functions
 * - Pre-populating test data
 */

-- Drop existing tables and views (if they exist)
DROP VIEW IF EXISTS user_subscription_status;
DROP TABLE IF EXISTS user_subscriptions CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;

-- Create subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),  -- Unique identifier for each plan
  name text NOT NULL,                              -- Plan name
  price decimal NOT NULL,                          -- Plan price
  period text NOT NULL,                            -- Billing period ('monthly', 'quarterly', 'yearly')
  description text,                                -- Plan description
  features jsonb NOT NULL,                         -- Plan features as JSON
  is_popular boolean DEFAULT false,                -- Flag for popular plans
  created_at timestamptz DEFAULT now(),            -- Record creation timestamp
  updated_at timestamptz DEFAULT now()             -- Record last update timestamp
);

-- Create user subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),  -- Unique identifier for each subscription
  user_id uuid REFERENCES auth.users(id),          -- Reference to auth.users table
  plan_id uuid REFERENCES subscription_plans(id) NOT NULL, -- Reference to subscription plan
  wallet_id uuid,                                  -- Reference to user's wallet (FK to be added later)
  contract_object_id text,                         -- Contract object ID in blockchain
  status text NOT NULL,                            -- Subscription status ('active', 'canceled', 'expired')
  start_date timestamptz NOT NULL,                 -- Subscription start date
  end_date timestamptz NOT NULL,                   -- Subscription end date
  auto_renew boolean DEFAULT true,                 -- Auto-renewal flag
  created_at timestamptz DEFAULT now(),            -- Record creation timestamp
  updated_at timestamptz DEFAULT now()             -- Record last update timestamp
);

-- Create subscription status view
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

-- Function to check subscription expiry
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

-- Create trigger for subscription expiry check
CREATE TRIGGER update_subscription_status
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION check_subscription_expiry();

-- Pre-populate subscription plans
INSERT INTO subscription_plans (name, price, period, features, is_popular)
VALUES 
  ('monthly', 35, 'monthly', '["Basic"]'::jsonb, false),
  ('quarterly', 99, 'quarterly', '["Premium"]'::jsonb, true),
  ('yearly', 365, 'yearly', '["Enterprise"]'::jsonb, false)
ON CONFLICT DO NOTHING;

-- Insert test data with fixed ID for testing
INSERT INTO subscription_plans (id, name, price, period, features, is_popular)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'test', 1, 'monthly', '["test"]'::jsonb, false)
ON CONFLICT DO NOTHING;

-- Create test subscription record
INSERT INTO user_subscriptions (
  user_id, 
  plan_id, 
  status, 
  start_date, 
  end_date
)
VALUES (
  NULL, -- Use NULL if in a session-less environment
  '00000000-0000-0000-0000-000000000001', -- Use fixed ID
  'active', 
  now(), 
  now() + interval '1 month'
);

-- Add troubleshooting query (for testing)
SELECT * FROM subscription_plans; 