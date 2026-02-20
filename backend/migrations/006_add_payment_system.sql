-- Migration 006: Payment System and Subscriptions
-- Description: Adds tables for Stripe subscriptions, payment tracking, and feature gating
-- Run this in Supabase SQL Editor after setting up Stripe

-- ============================================================================
-- SUBSCRIPTION PLANS
-- ============================================================================

-- Subscription plan types enum
CREATE TYPE subscription_plan_type AS ENUM ('free', 'premium');

-- Subscription status enum
CREATE TYPE subscription_status AS ENUM (
  'active',           -- Currently active subscription
  'past_due',         -- Payment failed, grace period
  'canceled',         -- User canceled, still active until period end
  'expired',          -- Subscription ended
  'trialing',         -- In free trial period
  'incomplete',       -- First payment pending
  'incomplete_expired' -- First payment failed
);

-- Payment status enum
CREATE TYPE payment_status AS ENUM (
  'succeeded',
  'pending',
  'failed',
  'refunded',
  'canceled'
);

-- Subscription plans (predefined tiers)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  plan_type subscription_plan_type NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  price_yearly DECIMAL(10, 2) DEFAULT NULL,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  stripe_product_id TEXT,
  
  -- Feature limits
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  max_watchlist_stocks INTEGER DEFAULT -1,  -- -1 = unlimited
  max_alerts INTEGER DEFAULT -1,
  max_screening_runs_per_day INTEGER DEFAULT -1,
  max_analysis_runs_per_day INTEGER DEFAULT -1,
  max_chat_messages_per_day INTEGER DEFAULT -1,
  
  -- Features enabled (boolean flags)
  enable_technical_indicators BOOLEAN DEFAULT false,
  enable_realtime_data BOOLEAN DEFAULT false,
  enable_advanced_screening BOOLEAN DEFAULT false,
  enable_pdf_export BOOLEAN DEFAULT false,
  enable_email_alerts BOOLEAN DEFAULT false,
  enable_priority_support BOOLEAN DEFAULT false,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on plan type for quick lookups
CREATE INDEX idx_subscription_plans_type ON subscription_plans(plan_type);

-- ============================================================================
-- USER SUBSCRIPTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  
  -- Stripe identifiers
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_checkout_session_id TEXT,
  
  -- Subscription details
  status subscription_status NOT NULL DEFAULT 'incomplete',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  
  -- Billing
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')),
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'usd',
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id)  -- One active subscription per user
);

-- Indexes for subscriptions
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end);

-- ============================================================================
-- PAYMENT HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  
  -- Stripe identifiers
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT,
  stripe_invoice_id TEXT,
  
  -- Payment details
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  status payment_status NOT NULL,
  payment_method TEXT,  -- card, bank_transfer, etc.
  
  -- Failure information
  failure_code TEXT,
  failure_message TEXT,
  
  -- Refund information
  refunded_amount DECIMAL(10, 2) DEFAULT 0.00,
  refunded_at TIMESTAMPTZ,
  
  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for payment history
CREATE INDEX idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX idx_payment_history_subscription ON payment_history(subscription_id);
CREATE INDEX idx_payment_history_stripe_payment ON payment_history(stripe_payment_intent_id);
CREATE INDEX idx_payment_history_status ON payment_history(status);
CREATE INDEX idx_payment_history_created ON payment_history(created_at DESC);

-- ============================================================================
-- FEATURE USAGE TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Usage date (for daily limits)
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Daily counters
  screening_runs INTEGER DEFAULT 0,
  analysis_runs INTEGER DEFAULT 0,
  chat_messages INTEGER DEFAULT 0,
  alerts_created INTEGER DEFAULT 0,
  pdf_exports INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one row per user per day
  UNIQUE(user_id, usage_date)
);

-- Indexes for feature usage
CREATE INDEX idx_feature_usage_user_date ON feature_usage(user_id, usage_date);
CREATE INDEX idx_feature_usage_date ON feature_usage(usage_date);

-- ============================================================================
-- WEBHOOKS LOG (for debugging Stripe webhooks)
-- ============================================================================

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processing_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Indexes for webhook events
CREATE INDEX idx_webhook_events_type ON stripe_webhook_events(event_type);
CREATE INDEX idx_webhook_events_processed ON stripe_webhook_events(processed);
CREATE INDEX idx_webhook_events_created ON stripe_webhook_events(created_at DESC);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get user's subscription details with plan info
CREATE OR REPLACE FUNCTION get_user_subscription(p_user_id UUID)
RETURNS TABLE (
  subscription_id UUID,
  plan_name TEXT,
  plan_type subscription_plan_type,
  status subscription_status,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN,
  features JSONB,
  limits JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    sp.name,
    sp.plan_type,
    s.status,
    s.current_period_end,
    s.cancel_at_period_end,
    sp.features,
    jsonb_build_object(
      'max_watchlist_stocks', sp.max_watchlist_stocks,
      'max_alerts', sp.max_alerts,
      'max_screening_runs_per_day', sp.max_screening_runs_per_day,
      'max_analysis_runs_per_day', sp.max_analysis_runs_per_day,
      'max_chat_messages_per_day', sp.max_chat_messages_per_day,
      'enable_technical_indicators', sp.enable_technical_indicators,
      'enable_realtime_data', sp.enable_realtime_data,
      'enable_advanced_screening', sp.enable_advanced_screening,
      'enable_pdf_export', sp.enable_pdf_export,
      'enable_email_alerts', sp.enable_email_alerts,
      'enable_priority_support', sp.enable_priority_support
    ) AS limits
  FROM subscriptions s
  JOIN subscription_plans sp ON s.plan_id = sp.id
  WHERE s.user_id = p_user_id
  AND s.status IN ('active', 'trialing', 'past_due')
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has access to a feature
CREATE OR REPLACE FUNCTION has_feature_access(
  p_user_id UUID,
  p_feature_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_access BOOLEAN;
BEGIN
  -- Get feature access from subscription plan
  SELECT 
    CASE p_feature_name
      WHEN 'technical_indicators' THEN sp.enable_technical_indicators
      WHEN 'realtime_data' THEN sp.enable_realtime_data
      WHEN 'advanced_screening' THEN sp.enable_advanced_screening
      WHEN 'pdf_export' THEN sp.enable_pdf_export
      WHEN 'email_alerts' THEN sp.enable_email_alerts
      WHEN 'priority_support' THEN sp.enable_priority_support
      ELSE false
    END INTO v_has_access
  FROM subscriptions s
  JOIN subscription_plans sp ON s.plan_id = sp.id
  WHERE s.user_id = p_user_id
  AND s.status IN ('active', 'trialing', 'past_due');
  
  RETURN COALESCE(v_has_access, false);
END;
$$ LANGUAGE plpgsql;

-- Function to check daily usage limits
CREATE OR REPLACE FUNCTION check_usage_limit(
  p_user_id UUID,
  p_limit_type TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_limit INTEGER;
  v_usage INTEGER;
  v_allowed BOOLEAN;
BEGIN
  -- Get user's plan limit
  SELECT 
    CASE p_limit_type
      WHEN 'screening_runs' THEN sp.max_screening_runs_per_day
      WHEN 'analysis_runs' THEN sp.max_analysis_runs_per_day
      WHEN 'chat_messages' THEN sp.max_chat_messages_per_day
      WHEN 'alerts' THEN sp.max_alerts
      ELSE -1
    END INTO v_limit
  FROM subscriptions s
  JOIN subscription_plans sp ON s.plan_id = sp.id
  WHERE s.user_id = p_user_id
  AND s.status IN ('active', 'trialing', 'past_due');
  
  -- If no limit found, default to free tier limits
  v_limit := COALESCE(v_limit, 10);
  
  -- Get today's usage
  SELECT 
    CASE p_limit_type
      WHEN 'screening_runs' THEN COALESCE(screening_runs, 0)
      WHEN 'analysis_runs' THEN COALESCE(analysis_runs, 0)
      WHEN 'chat_messages' THEN COALESCE(chat_messages, 0)
      ELSE 0
    END INTO v_usage
  FROM feature_usage
  WHERE user_id = p_user_id
  AND usage_date = CURRENT_DATE;
  
  v_usage := COALESCE(v_usage, 0);
  
  -- Check if allowed (-1 means unlimited)
  v_allowed := (v_limit = -1 OR v_usage < v_limit);
  
  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'limit', v_limit,
    'used', v_usage,
    'remaining', CASE WHEN v_limit = -1 THEN -1 ELSE GREATEST(0, v_limit - v_usage) END
  );
END;
$$ LANGUAGE plpgsql;

-- Function to increment usage counter
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_usage_type TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO feature_usage (user_id, usage_date, screening_runs, analysis_runs, chat_messages, alerts_created, pdf_exports)
  VALUES (
    p_user_id,
    CURRENT_DATE,
    CASE WHEN p_usage_type = 'screening_runs' THEN 1 ELSE 0 END,
    CASE WHEN p_usage_type = 'analysis_runs' THEN 1 ELSE 0 END,
    CASE WHEN p_usage_type = 'chat_messages' THEN 1 ELSE 0 END,
    CASE WHEN p_usage_type = 'alerts_created' THEN 1 ELSE 0 END,
    CASE WHEN p_usage_type = 'pdf_exports' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    screening_runs = CASE WHEN p_usage_type = 'screening_runs' THEN feature_usage.screening_runs + 1 ELSE feature_usage.screening_runs END,
    analysis_runs = CASE WHEN p_usage_type = 'analysis_runs' THEN feature_usage.analysis_runs + 1 ELSE feature_usage.analysis_runs END,
    chat_messages = CASE WHEN p_usage_type = 'chat_messages' THEN feature_usage.chat_messages + 1 ELSE feature_usage.chat_messages END,
    alerts_created = CASE WHEN p_usage_type = 'alerts_created' THEN feature_usage.alerts_created + 1 ELSE feature_usage.alerts_created END,
    pdf_exports = CASE WHEN p_usage_type = 'pdf_exports' THEN feature_usage.pdf_exports + 1 ELSE feature_usage.pdf_exports END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to clean old usage data (keep last 90 days)
CREATE OR REPLACE FUNCTION clean_old_usage_data()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM feature_usage
  WHERE usage_date < CURRENT_DATE - INTERVAL '90 days';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_history_updated_at
  BEFORE UPDATE ON payment_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_usage_updated_at
  BEFORE UPDATE ON feature_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA: Default Subscription Plans
-- ============================================================================

-- Free Plan
INSERT INTO subscription_plans (
  name, 
  plan_type, 
  display_name, 
  description, 
  price_monthly,
  features,
  max_watchlist_stocks,
  max_alerts,
  max_screening_runs_per_day,
  max_analysis_runs_per_day,
  max_chat_messages_per_day,
  enable_technical_indicators,
  enable_realtime_data,
  enable_advanced_screening,
  enable_pdf_export,
  enable_email_alerts,
  enable_priority_support
) VALUES (
  'free',
  'free',
  'Free Plan',
  'Perfect for getting started with fundamental analysis',
  0.00,
  jsonb_build_array(
    'Basic stock analysis',
    'Up to 10 stocks in watchlist',
    '5 screening runs per day',
    '10 analysis runs per day',
    'Community support'
  ),
  10,    -- max_watchlist_stocks
  5,     -- max_alerts
  5,     -- max_screening_runs_per_day
  10,    -- max_analysis_runs_per_day
  20,    -- max_chat_messages_per_day
  false, -- enable_technical_indicators
  false, -- enable_realtime_data
  false, -- enable_advanced_screening
  false, -- enable_pdf_export
  false, -- enable_email_alerts
  false  -- enable_priority_support
) ON CONFLICT (name) DO NOTHING;

-- Premium Plan
INSERT INTO subscription_plans (
  name, 
  plan_type, 
  display_name, 
  description, 
  price_monthly,
  price_yearly,
  features,
  max_watchlist_stocks,
  max_alerts,
  max_screening_runs_per_day,
  max_analysis_runs_per_day,
  max_chat_messages_per_day,
  enable_technical_indicators,
  enable_realtime_data,
  enable_advanced_screening,
  enable_pdf_export,
  enable_email_alerts,
  enable_priority_support
) VALUES (
  'premium',
  'premium',
  'Premium Plan',
  'Unlock all features and unlimited access',
  29.00,
  290.00,  -- ~$24/month when paid yearly
  jsonb_build_array(
    'Everything in Free',
    'Unlimited stocks & watchlists',
    'Technical indicators (RSI, MACD, etc.)',
    'Real-time market data & alerts',
    'Advanced screening filters',
    'Unlimited analysis & screening',
    'PDF export of reports',
    'Email notifications',
    'Priority support'
  ),
  -1,   -- max_watchlist_stocks (unlimited)
  -1,   -- max_alerts (unlimited)
  -1,   -- max_screening_runs_per_day (unlimited)
  -1,   -- max_analysis_runs_per_day (unlimited)
  -1,   -- max_chat_messages_per_day (unlimited)
  true, -- enable_technical_indicators
  true, -- enable_realtime_data
  true, -- enable_advanced_screening
  true, -- enable_pdf_export
  true, -- enable_email_alerts
  true  -- enable_priority_support
) ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;

-- Subscription policies: Users can only see their own subscription
CREATE POLICY "Users can view their own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Payment history policies: Users can only see their own payments
CREATE POLICY "Users can view their own payment history"
  ON payment_history FOR SELECT
  USING (auth.uid() = user_id);

-- Feature usage policies: Users can view their own usage
CREATE POLICY "Users can view their own feature usage"
  ON feature_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Subscription plans are public (everyone can see plans)
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view subscription plans"
  ON subscription_plans FOR SELECT
  USING (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE subscription_plans IS 'Available subscription tiers (Free, Premium)';
COMMENT ON TABLE subscriptions IS 'User subscription records with Stripe integration';
COMMENT ON TABLE payment_history IS 'Transaction log for all payments and refunds';
COMMENT ON TABLE feature_usage IS 'Track daily usage against plan limits';
COMMENT ON TABLE stripe_webhook_events IS 'Log of all Stripe webhook events for debugging';

COMMENT ON FUNCTION get_user_subscription IS 'Get complete subscription info for a user including plan features and limits';
COMMENT ON FUNCTION has_feature_access IS 'Check if user has access to a specific premium feature';
COMMENT ON FUNCTION check_usage_limit IS 'Check if user has remaining quota for a feature (returns limit, used, remaining)';
COMMENT ON FUNCTION increment_usage IS 'Increment usage counter for rate limiting';
COMMENT ON FUNCTION clean_old_usage_data IS 'Delete usage data older than 90 days';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('subscription_plans', 'subscriptions', 'payment_history', 'feature_usage', 'stripe_webhook_events')
ORDER BY table_name;

-- Verify seed data
SELECT name, display_name, price_monthly, plan_type 
FROM subscription_plans 
ORDER BY price_monthly;

-- Show plan features
SELECT 
  name,
  display_name,
  price_monthly,
  max_watchlist_stocks,
  max_screening_runs_per_day,
  enable_technical_indicators,
  enable_realtime_data
FROM subscription_plans
ORDER BY price_monthly;
