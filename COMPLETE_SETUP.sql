-- Initial Database Schema for FundaVision
-- This creates the core tables needed for the application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
-- This table stores additional user profile information
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium', 'enterprise')),
  reports_used INTEGER NOT NULL DEFAULT 0,
  reports_limit INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  company TEXT NOT NULL,
  ticker TEXT NOT NULL,
  exchange TEXT NOT NULL,
  overall_score NUMERIC(3, 1) NOT NULL,
  summary TEXT NOT NULL,
  metrics JSONB NOT NULL,
  key_ratios JSONB NOT NULL,
  strengths TEXT[] NOT NULL,
  red_flags TEXT[] NOT NULL,
  investment_assessment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Source documents table
CREATE TABLE IF NOT EXISTS public.source_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Watchlist table
CREATE TABLE IF NOT EXISTS public.watchlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  ticker TEXT NOT NULL,
  company_name TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, ticker)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_ticker ON public.reports(ticker);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_source_documents_user_id ON public.source_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_source_documents_report_id ON public.source_documents(report_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_report_id ON public.chat_messages(report_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON public.watchlist(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can insert own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can update own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can delete own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can view own documents" ON public.source_documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON public.source_documents;
DROP POLICY IF EXISTS "Users can view own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view own watchlist" ON public.watchlist;
DROP POLICY IF EXISTS "Users can insert own watchlist" ON public.watchlist;
DROP POLICY IF EXISTS "Users can delete own watchlist" ON public.watchlist;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for reports table
CREATE POLICY "Users can view own reports" ON public.reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reports" ON public.reports
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reports" ON public.reports
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for source_documents table
CREATE POLICY "Users can view own documents" ON public.source_documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON public.source_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for chat_messages table
CREATE POLICY "Users can view own chat messages" ON public.chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for watchlist table
CREATE POLICY "Users can view own watchlist" ON public.watchlist
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlist" ON public.watchlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist" ON public.watchlist
  FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically create user profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Trigger to create user profile automatically
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.users;
DROP TRIGGER IF EXISTS set_updated_at ON public.reports;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;

CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Verification queries
DO $$
BEGIN
  RAISE NOTICE '✅ Schema initialized successfully';
  RAISE NOTICE '   - auth.users (Supabase managed)';
  RAISE NOTICE '   - public.users';
  RAISE NOTICE '   - public.reports';
  RAISE NOTICE '   - public.source_documents';
  RAISE NOTICE '   - public.chat_messages';
  RAISE NOTICE '   - public.watchlist';
  RAISE NOTICE '   - RLS policies enabled';
  RAISE NOTICE '   - Triggers configured';
  RAISE NOTICE '   - Storage bucket created';
END $$;
-- Migration: Update reports table to support AI analysis workflow
-- Created: 2024-01-XX
-- Purpose: Add status tracking, analysis results, and error handling

-- Add new columns to reports table
ALTER TABLE public.reports 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES public.source_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS analysis_result JSONB,
  ADD COLUMN IF NOT EXISTS error TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Make existing columns nullable since they'll be populated after analysis
ALTER TABLE public.reports 
  ALTER COLUMN company DROP NOT NULL,
  ALTER COLUMN ticker DROP NOT NULL,
  ALTER COLUMN exchange DROP NOT NULL,
  ALTER COLUMN overall_score DROP NOT NULL,
  ALTER COLUMN summary DROP NOT NULL,
  ALTER COLUMN metrics DROP NOT NULL,
  ALTER COLUMN key_ratios DROP NOT NULL,
  ALTER COLUMN strengths DROP NOT NULL,
  ALTER COLUMN red_flags DROP NOT NULL,
  ALTER COLUMN investment_assessment DROP NOT NULL;

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);

-- Create index on source_document_id for lookups
CREATE INDEX IF NOT EXISTS idx_reports_source_document ON public.reports(source_document_id);

-- Add comment to explain the schema
COMMENT ON COLUMN public.reports.status IS 'Analysis status: pending, processing, completed, failed';
COMMENT ON COLUMN public.reports.analysis_result IS 'Full AI analysis result as JSON';
COMMENT ON COLUMN public.reports.error IS 'Error message if analysis failed';
COMMENT ON COLUMN public.reports.source_document_id IS 'Link to uploaded document that was analyzed';
-- Migration: Create stocks and screening tables
-- Created: 2026-02-20
-- Purpose: Support stock scanner feature with cached data and saved screens

-- Stocks table (cached market data)
CREATE TABLE IF NOT EXISTS public.stocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sector TEXT,
  industry TEXT,
  exchange TEXT,
  currency TEXT DEFAULT 'USD',
  country TEXT,
  
  -- Price data
  price NUMERIC(12, 2),
  change NUMERIC(12, 2),
  change_percent NUMERIC(8, 4),
  volume BIGINT,
  market_cap BIGINT,
  
  -- Fundamental metrics
  pe_ratio NUMERIC(10, 2),
  peg_ratio NUMERIC(10, 2),
  pb_ratio NUMERIC(10, 2),
  dividend_yield NUMERIC(8, 4),
  eps NUMERIC(10, 2),
  
  -- Profitability
  profit_margin NUMERIC(8, 4),
  operating_margin NUMERIC(8, 4),
  roe NUMERIC(8, 4),
  roa NUMERIC(8, 4),
  
  -- Growth
  revenue_growth NUMERIC(8, 4),
  earnings_growth NUMERIC(8, 4),
  
  -- Financial health
  current_ratio NUMERIC(10, 2),
  quick_ratio NUMERIC(10, 2),
  debt_to_equity NUMERIC(10, 2),
  
  -- Trading
  beta NUMERIC(10, 4),
  week_52_high NUMERIC(12, 2),
  week_52_low NUMERIC(12, 2),
  avg_volume BIGINT,
  shares_outstanding BIGINT,
  
  -- Metadata
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_source TEXT DEFAULT 'alpha_vantage',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Saved screens table (user custom filters)
CREATE TABLE IF NOT EXISTS public.saved_screens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  filters JSONB NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Watchlist table
CREATE TABLE IF NOT EXISTS public.watchlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  ticker TEXT NOT NULL,
  notes TEXT,
  target_price NUMERIC(12, 2),
  alert_enabled BOOLEAN DEFAULT FALSE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, ticker)
);

-- Screening results cache (optional, for performance)
CREATE TABLE IF NOT EXISTS public.screening_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filter_hash TEXT UNIQUE NOT NULL,
  results JSONB NOT NULL,
  result_count INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stocks_ticker ON public.stocks(ticker);
CREATE INDEX IF NOT EXISTS idx_stocks_sector ON public.stocks(sector);
CREATE INDEX IF NOT EXISTS idx_stocks_market_cap ON public.stocks(market_cap DESC);
CREATE INDEX IF NOT EXISTS idx_stocks_pe_ratio ON public.stocks(pe_ratio);
CREATE INDEX IF NOT EXISTS idx_stocks_updated ON public.stocks(last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_stocks_active ON public.stocks(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_saved_screens_user ON public.saved_screens(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_user ON public.watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_ticker ON public.watchlists(ticker);

-- Function to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_stocks_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for stocks updates
DROP TRIGGER IF EXISTS trigger_update_stocks_timestamp ON public.stocks;
CREATE TRIGGER trigger_update_stocks_timestamp
  BEFORE UPDATE ON public.stocks
  FOR EACH ROW
  EXECUTE FUNCTION update_stocks_timestamp();

-- Function to clean expired cache
CREATE OR REPLACE FUNCTION clean_expired_screening_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.screening_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE public.stocks IS 'Cached stock market data for screening';
COMMENT ON TABLE public.saved_screens IS 'User-saved custom screening filters';
COMMENT ON TABLE public.watchlists IS 'User stock watchlists with alerts';
COMMENT ON TABLE public.screening_cache IS 'Temporary cache for screening results';

COMMENT ON COLUMN public.stocks.last_updated IS 'When stock data was last refreshed from API';
COMMENT ON COLUMN public.stocks.is_active IS 'Whether stock is actively traded';
COMMENT ON COLUMN public.saved_screens.filters IS 'JSON array of filter conditions';
COMMENT ON COLUMN public.screening_cache.filter_hash IS 'MD5 hash of filter criteria';
-- Migration: Add real-time market data features
-- Created: 2026-02-20
-- Purpose: Support price alerts, notifications, and historical data

-- Price alerts table
CREATE TABLE IF NOT EXISTS public.price_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  ticker TEXT NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('above', 'below')),
  target_price NUMERIC(12, 2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  triggered_at TIMESTAMPTZ,
  triggered_price NUMERIC(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, ticker, condition, target_price, is_active)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Historical prices table (for charts)
CREATE TABLE IF NOT EXISTS public.price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker TEXT NOT NULL,
  date DATE NOT NULL,
  open NUMERIC(12, 2),
  high NUMERIC(12, 2),
  low NUMERIC(12, 2),
  close NUMERIC(12, 2) NOT NULL,
  volume BIGINT,
  adjusted_close NUMERIC(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ticker, date)
);

-- Intraday prices table (minute-level data)
CREATE TABLE IF NOT EXISTS public.intraday_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  price NUMERIC(12, 2) NOT NULL,
  volume BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON public.price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_ticker ON public.price_alerts(ticker);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON public.price_alerts(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_price_history_ticker ON public.price_history(ticker);
CREATE INDEX IF NOT EXISTS idx_price_history_date ON public.price_history(ticker, date DESC);

CREATE INDEX IF NOT EXISTS idx_intraday_ticker ON public.intraday_prices(ticker);
CREATE INDEX IF NOT EXISTS idx_intraday_timestamp ON public.intraday_prices(ticker, timestamp DESC);

-- Function to clean old intraday data (keep last 7 days)
CREATE OR REPLACE FUNCTION clean_old_intraday_prices()
RETURNS void AS $$
BEGIN
  DELETE FROM public.intraday_prices 
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Function to get price change for a stock
CREATE OR REPLACE FUNCTION get_price_change(p_ticker TEXT, p_days INT DEFAULT 1)
RETURNS TABLE(
  ticker TEXT,
  current_price NUMERIC,
  previous_price NUMERIC,
  change NUMERIC,
  change_percent NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p_ticker,
    s.price,
    ph.close as previous_price,
    (s.price - ph.close) as change,
    CASE 
      WHEN ph.close > 0 THEN ((s.price - ph.close) / ph.close * 100)
      ELSE 0
    END as change_percent
  FROM 
    public.stocks s
  LEFT JOIN LATERAL (
    SELECT close 
    FROM public.price_history 
    WHERE ticker = p_ticker 
      AND date <= CURRENT_DATE - p_days
    ORDER BY date DESC 
    LIMIT 1
  ) ph ON TRUE
  WHERE s.ticker = p_ticker;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE public.price_alerts IS 'User price alerts for stock notifications';
COMMENT ON TABLE public.notifications IS 'User notification center messages';
COMMENT ON TABLE public.price_history IS 'Daily historical price data (OHLCV)';
COMMENT ON TABLE public.intraday_prices IS 'Minute-level intraday price data (7 day retention)';

COMMENT ON COLUMN public.price_alerts.condition IS 'Alert condition: above or below target price';
COMMENT ON COLUMN public.price_alerts.is_active IS 'Whether alert is active (deactivated after trigger)';
COMMENT ON COLUMN public.notifications.type IS 'Notification type: price_alert, report_complete, etc.';
COMMENT ON COLUMN public.notifications.data IS 'Additional notification metadata as JSON';
-- Migration: Add technical indicators support
-- Created: 2026-02-20
-- Purpose: Store calculated technical indicators and signals

-- Technical indicators cache table
CREATE TABLE IF NOT EXISTS public.technical_indicators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker TEXT NOT NULL,
  date DATE NOT NULL,
  
  -- Moving Averages
  sma_20 NUMERIC(12, 2),
  sma_50 NUMERIC(12, 2),
  sma_200 NUMERIC(12, 2),
  ema_12 NUMERIC(12, 2),
  ema_26 NUMERIC(12, 2),
  
  -- Momentum Indicators
  rsi NUMERIC(5, 2),
  macd NUMERIC(12, 4),
  macd_signal NUMERIC(12, 4),
  macd_histogram NUMERIC(12, 4),
  
  -- Volatility Indicators
  bb_upper NUMERIC(12, 2),
  bb_middle NUMERIC(12, 2),
  bb_lower NUMERIC(12, 2),
  atr NUMERIC(12, 4),
  
  -- Oscillators
  stoch_k NUMERIC(5, 2),
  stoch_d NUMERIC(5, 2),
  
  -- Volume
  obv BIGINT,
  
  -- Price data
  close_price NUMERIC(12, 2) NOT NULL,
  volume BIGINT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(ticker, date)
);

-- Trading signals table
CREATE TABLE IF NOT EXISTS public.trading_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('BUY', 'SELL', 'STRONG BUY', 'STRONG SELL', 'NEUTRAL')),
  signal_strength NUMERIC(5, 2) NOT NULL,
  
  -- Signal details
  buy_signals JSONB,
  sell_signals JSONB,
  details JSONB,
  
  -- Metadata
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User signal alerts (notify when signal changes)
CREATE TABLE IF NOT EXISTS public.signal_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  ticker TEXT NOT NULL,
  alert_on TEXT[] NOT NULL DEFAULT ARRAY['STRONG BUY', 'STRONG SELL'],
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, ticker)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_technical_indicators_ticker ON public.technical_indicators(ticker);
CREATE INDEX IF NOT EXISTS idx_technical_indicators_date ON public.technical_indicators(ticker, date DESC);

CREATE INDEX IF NOT EXISTS idx_trading_signals_ticker ON public.trading_signals(ticker);
CREATE INDEX IF NOT EXISTS idx_trading_signals_type ON public.trading_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_trading_signals_strength ON public.trading_signals(signal_strength DESC);
CREATE INDEX IF NOT EXISTS idx_trading_signals_generated ON public.trading_signals(generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_signal_alerts_user ON public.signal_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_signal_alerts_ticker ON public.signal_alerts(ticker);
CREATE INDEX IF NOT EXISTS idx_signal_alerts_active ON public.signal_alerts(is_active) WHERE is_active = TRUE;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_technical_indicators_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_technical_indicators_timestamp
BEFORE UPDATE ON public.technical_indicators
FOR EACH ROW
EXECUTE FUNCTION update_technical_indicators_timestamp();

-- Function to get latest indicator for a stock
CREATE OR REPLACE FUNCTION get_latest_indicators(p_ticker TEXT)
RETURNS TABLE(
  ticker TEXT,
  date DATE,
  sma_20 NUMERIC,
  sma_50 NUMERIC,
  sma_200 NUMERIC,
  rsi NUMERIC,
  macd NUMERIC,
  signal_type TEXT,
  signal_strength NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ti.ticker,
    ti.date,
    ti.sma_20,
    ti.sma_50,
    ti.sma_200,
    ti.rsi,
    ti.macd,
    ts.signal_type,
    ts.signal_strength
  FROM 
    public.technical_indicators ti
  LEFT JOIN LATERAL (
    SELECT signal_type, signal_strength
    FROM public.trading_signals
    WHERE ticker = p_ticker
    ORDER BY generated_at DESC
    LIMIT 1
  ) ts ON TRUE
  WHERE ti.ticker = p_ticker
  ORDER BY ti.date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to clean old technical indicators (keep last 2 years)
CREATE OR REPLACE FUNCTION clean_old_technical_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM public.technical_indicators 
  WHERE date < CURRENT_DATE - INTERVAL '2 years';
  
  DELETE FROM public.trading_signals
  WHERE generated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE public.technical_indicators IS 'Cached technical indicator calculations';
COMMENT ON TABLE public.trading_signals IS 'Generated buy/sell trading signals';
COMMENT ON TABLE public.signal_alerts IS 'User alerts for signal changes';

COMMENT ON COLUMN public.technical_indicators.rsi IS 'Relative Strength Index (0-100)';
COMMENT ON COLUMN public.technical_indicators.macd IS 'MACD line value';
COMMENT ON COLUMN public.technical_indicators.bb_upper IS 'Upper Bollinger Band';
COMMENT ON COLUMN public.technical_indicators.stoch_k IS 'Stochastic %K (0-100)';
COMMENT ON COLUMN public.trading_signals.signal_strength IS 'Signal confidence (0-100)';
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
-- Migration 007: Portfolio Tracking System
-- Description: Add tables for portfolio management, holdings, transactions, and performance tracking
-- Date: 2026-02-20

-- ============================================================================
-- PORTFOLIOS TABLE
-- ============================================================================
-- Stores user portfolios (users can have multiple portfolios)
CREATE TABLE IF NOT EXISTS portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    currency VARCHAR(3) DEFAULT 'USD',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_portfolio_name_per_user UNIQUE (user_id, name)
);

CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX idx_portfolios_default ON portfolios(user_id, is_default) WHERE is_default = true;

COMMENT ON TABLE portfolios IS 'User portfolios for tracking stock holdings';
COMMENT ON COLUMN portfolios.is_default IS 'Whether this is the user''s default portfolio';
COMMENT ON COLUMN portfolios.currency IS 'Base currency for portfolio valuation';

-- ============================================================================
-- PORTFOLIO HOLDINGS TABLE
-- ============================================================================
-- Current holdings in each portfolio (aggregated view)
CREATE TABLE IF NOT EXISTS portfolio_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    company_name VARCHAR(500),
    quantity DECIMAL(20, 8) NOT NULL CHECK (quantity >= 0),
    avg_cost_basis DECIMAL(20, 4) NOT NULL CHECK (avg_cost_basis >= 0),
    total_cost DECIMAL(20, 4) GENERATED ALWAYS AS (quantity * avg_cost_basis) STORED,
    first_purchase_date TIMESTAMP WITH TIME ZONE,
    last_transaction_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_holding_per_portfolio UNIQUE (portfolio_id, ticker)
);

CREATE INDEX idx_holdings_portfolio_id ON portfolio_holdings(portfolio_id);
CREATE INDEX idx_holdings_ticker ON portfolio_holdings(ticker);

COMMENT ON TABLE portfolio_holdings IS 'Current stock holdings in portfolios (aggregated from transactions)';
COMMENT ON COLUMN portfolio_holdings.avg_cost_basis IS 'Average cost per share (calculated from transactions)';
COMMENT ON COLUMN portfolio_holdings.total_cost IS 'Total invested amount (quantity * avg_cost_basis)';

-- ============================================================================
-- PORTFOLIO TRANSACTIONS TABLE
-- ============================================================================
-- All buy/sell transactions for portfolio holdings
CREATE TABLE IF NOT EXISTS portfolio_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    company_name VARCHAR(500),
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('BUY', 'SELL', 'DIVIDEND', 'SPLIT')),
    quantity DECIMAL(20, 8) NOT NULL,
    price_per_share DECIMAL(20, 4) NOT NULL CHECK (price_per_share >= 0),
    total_amount DECIMAL(20, 4) GENERATED ALWAYS AS (quantity * price_per_share) STORED,
    fees DECIMAL(20, 4) DEFAULT 0 CHECK (fees >= 0),
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transactions_portfolio_id ON portfolio_transactions(portfolio_id);
CREATE INDEX idx_transactions_ticker ON portfolio_transactions(ticker);
CREATE INDEX idx_transactions_date ON portfolio_transactions(transaction_date DESC);
CREATE INDEX idx_transactions_type ON portfolio_transactions(transaction_type);

COMMENT ON TABLE portfolio_transactions IS 'All portfolio transactions (buy, sell, dividends, splits)';
COMMENT ON COLUMN portfolio_transactions.transaction_type IS 'Type: BUY, SELL, DIVIDEND, SPLIT';
COMMENT ON COLUMN portfolio_transactions.fees IS 'Transaction fees/commissions';

-- ============================================================================
-- PORTFOLIO SNAPSHOTS TABLE
-- ============================================================================
-- Historical portfolio values for performance tracking
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    total_value DECIMAL(20, 4) NOT NULL,
    total_cost DECIMAL(20, 4) NOT NULL,
    total_gain_loss DECIMAL(20, 4) NOT NULL,
    gain_loss_pct DECIMAL(10, 4) NOT NULL,
    num_holdings INTEGER NOT NULL,
    snapshot_data JSONB, -- Detailed holdings data at snapshot time
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_snapshot_per_day UNIQUE (portfolio_id, snapshot_date)
);

CREATE INDEX idx_snapshots_portfolio_id ON portfolio_snapshots(portfolio_id);
CREATE INDEX idx_snapshots_date ON portfolio_snapshots(snapshot_date DESC);

COMMENT ON TABLE portfolio_snapshots IS 'Historical portfolio values for performance tracking';
COMMENT ON COLUMN portfolio_snapshots.snapshot_data IS 'JSONB with detailed holdings at snapshot time';

-- ============================================================================
-- PORTFOLIO PERFORMANCE TABLE
-- ============================================================================
-- Aggregated performance metrics for each portfolio
CREATE TABLE IF NOT EXISTS portfolio_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    period VARCHAR(20) NOT NULL, -- 'all_time', '1y', '3m', '1m', '1w'
    total_return DECIMAL(10, 4) NOT NULL,
    total_return_pct DECIMAL(10, 4) NOT NULL,
    annualized_return_pct DECIMAL(10, 4),
    best_performing_stock VARCHAR(20),
    worst_performing_stock VARCHAR(20),
    total_dividends DECIMAL(20, 4) DEFAULT 0,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_performance_per_period UNIQUE (portfolio_id, period)
);

CREATE INDEX idx_performance_portfolio_id ON portfolio_performance(portfolio_id);

COMMENT ON TABLE portfolio_performance IS 'Aggregated performance metrics by time period';
COMMENT ON COLUMN portfolio_performance.period IS 'Time period: all_time, 1y, 3m, 1m, 1w';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_performance ENABLE ROW LEVEL SECURITY;

-- Portfolios policies
CREATE POLICY "Users can view their own portfolios"
    ON portfolios FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own portfolios"
    ON portfolios FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolios"
    ON portfolios FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portfolios"
    ON portfolios FOR DELETE
    USING (auth.uid() = user_id);

-- Portfolio holdings policies
CREATE POLICY "Users can view holdings in their portfolios"
    ON portfolio_holdings FOR SELECT
    USING (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can create holdings in their portfolios"
    ON portfolio_holdings FOR INSERT
    WITH CHECK (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can update holdings in their portfolios"
    ON portfolio_holdings FOR UPDATE
    USING (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete holdings in their portfolios"
    ON portfolio_holdings FOR DELETE
    USING (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));

-- Portfolio transactions policies
CREATE POLICY "Users can view transactions in their portfolios"
    ON portfolio_transactions FOR SELECT
    USING (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can create transactions in their portfolios"
    ON portfolio_transactions FOR INSERT
    WITH CHECK (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can update transactions in their portfolios"
    ON portfolio_transactions FOR UPDATE
    USING (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete transactions in their portfolios"
    ON portfolio_transactions FOR DELETE
    USING (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));

-- Portfolio snapshots policies
CREATE POLICY "Users can view snapshots of their portfolios"
    ON portfolio_snapshots FOR SELECT
    USING (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can create snapshots of their portfolios"
    ON portfolio_snapshots FOR INSERT
    WITH CHECK (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));

-- Portfolio performance policies
CREATE POLICY "Users can view performance of their portfolios"
    ON portfolio_performance FOR SELECT
    USING (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can create performance records for their portfolios"
    ON portfolio_performance FOR INSERT
    WITH CHECK (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_portfolio_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_portfolios_timestamp
    BEFORE UPDATE ON portfolios
    FOR EACH ROW
    EXECUTE FUNCTION update_portfolio_updated_at();

CREATE TRIGGER update_holdings_timestamp
    BEFORE UPDATE ON portfolio_holdings
    FOR EACH ROW
    EXECUTE FUNCTION update_portfolio_updated_at();

CREATE TRIGGER update_transactions_timestamp
    BEFORE UPDATE ON portfolio_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_portfolio_updated_at();

-- Function: Ensure only one default portfolio per user
CREATE OR REPLACE FUNCTION ensure_single_default_portfolio()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        -- Unset any existing default portfolios for this user
        UPDATE portfolios
        SET is_default = false
        WHERE user_id = NEW.user_id
          AND id != NEW.id
          AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_single_default_portfolio
    BEFORE INSERT OR UPDATE ON portfolios
    FOR EACH ROW
    WHEN (NEW.is_default = true)
    EXECUTE FUNCTION ensure_single_default_portfolio();

-- Function: Update holding after transaction
CREATE OR REPLACE FUNCTION update_holding_from_transaction()
RETURNS TRIGGER AS $$
DECLARE
    existing_holding portfolio_holdings%ROWTYPE;
    new_quantity DECIMAL(20, 8);
    new_avg_cost DECIMAL(20, 4);
    new_total_cost DECIMAL(20, 4);
BEGIN
    -- Get existing holding
    SELECT * INTO existing_holding
    FROM portfolio_holdings
    WHERE portfolio_id = NEW.portfolio_id
      AND ticker = NEW.ticker;
    
    IF NEW.transaction_type = 'BUY' THEN
        IF existing_holding.id IS NOT NULL THEN
            -- Update existing holding
            new_quantity := existing_holding.quantity + NEW.quantity;
            new_total_cost := (existing_holding.quantity * existing_holding.avg_cost_basis) + (NEW.quantity * NEW.price_per_share) + NEW.fees;
            new_avg_cost := new_total_cost / new_quantity;
            
            UPDATE portfolio_holdings
            SET quantity = new_quantity,
                avg_cost_basis = new_avg_cost,
                last_transaction_date = NEW.transaction_date,
                updated_at = NOW()
            WHERE id = existing_holding.id;
        ELSE
            -- Create new holding
            INSERT INTO portfolio_holdings (
                portfolio_id, ticker, company_name, quantity, avg_cost_basis,
                first_purchase_date, last_transaction_date
            ) VALUES (
                NEW.portfolio_id, NEW.ticker, NEW.company_name, NEW.quantity,
                NEW.price_per_share + (NEW.fees / NEW.quantity),
                NEW.transaction_date, NEW.transaction_date
            );
        END IF;
        
    ELSIF NEW.transaction_type = 'SELL' THEN
        IF existing_holding.id IS NOT NULL THEN
            new_quantity := existing_holding.quantity - NEW.quantity;
            
            IF new_quantity <= 0.00000001 THEN
                -- Delete holding if quantity is effectively zero
                DELETE FROM portfolio_holdings WHERE id = existing_holding.id;
            ELSE
                -- Update holding with reduced quantity (keep same avg cost)
                UPDATE portfolio_holdings
                SET quantity = new_quantity,
                    last_transaction_date = NEW.transaction_date,
                    updated_at = NOW()
                WHERE id = existing_holding.id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_holding_on_transaction
    AFTER INSERT ON portfolio_transactions
    FOR EACH ROW
    WHEN (NEW.transaction_type IN ('BUY', 'SELL'))
    EXECUTE FUNCTION update_holding_from_transaction();

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Note: No seed data for portfolios - users will create their own

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables were created
DO $$
BEGIN
    -- Check if tables exist
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'portfolios') THEN
        RAISE EXCEPTION 'Migration failed: portfolios table not created';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'portfolio_holdings') THEN
        RAISE EXCEPTION 'Migration failed: portfolio_holdings table not created';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'portfolio_transactions') THEN
        RAISE EXCEPTION 'Migration failed: portfolio_transactions table not created';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'portfolio_snapshots') THEN
        RAISE EXCEPTION 'Migration failed: portfolio_snapshots table not created';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'portfolio_performance') THEN
        RAISE EXCEPTION 'Migration failed: portfolio_performance table not created';
    END IF;
    
    RAISE NOTICE 'Migration 007 completed successfully!';
    RAISE NOTICE 'Created tables: portfolios, portfolio_holdings, portfolio_transactions, portfolio_snapshots, portfolio_performance';
    RAISE NOTICE 'Created indexes, RLS policies, and triggers';
END $$;
-- Migration 008: Watchlist Manager System
-- Description: Add tables for watchlists, watchlist items, and price targets
-- Date: 2026-02-20

-- ============================================================================
-- DROP EXISTING TABLES (if any from failed migrations)
-- ============================================================================
-- Drop in reverse order due to foreign key constraints
DROP TABLE IF EXISTS watchlist_snapshots CASCADE;
DROP TABLE IF EXISTS watchlist_items CASCADE;
DROP TABLE IF EXISTS watchlists CASCADE;

-- Drop the view if it exists
DROP VIEW IF EXISTS watchlist_summary CASCADE;

-- ============================================================================
-- WATCHLISTS TABLE
-- ============================================================================
-- User-created watchlists for tracking stocks of interest
CREATE TABLE watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    color VARCHAR(20), -- For UI color coding
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_watchlist_name_per_user UNIQUE (user_id, name)
);

CREATE INDEX idx_watchlists_user_id ON watchlists(user_id);
CREATE INDEX idx_watchlists_default ON watchlists(user_id, is_default) WHERE is_default = true;
CREATE INDEX idx_watchlists_sort ON watchlists(user_id, sort_order);

COMMENT ON TABLE watchlists IS 'User-created watchlists for tracking stocks';
COMMENT ON COLUMN watchlists.color IS 'Hex color code for UI display (e.g., #3b82f6)';
COMMENT ON COLUMN watchlists.sort_order IS 'User-defined order for displaying watchlists';

-- ============================================================================
-- WATCHLIST ITEMS TABLE
-- ============================================================================
-- Stocks added to watchlists with price targets and notes
CREATE TABLE watchlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    company_name VARCHAR(500),
    added_price DECIMAL(20, 4), -- Price when added to watchlist
    target_price DECIMAL(20, 4), -- User's price target
    target_price_type VARCHAR(10) CHECK (target_price_type IN ('BUY', 'SELL', 'ALERT')),
    notes TEXT,
    tags VARCHAR(50)[], -- Array of tags for filtering
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_item_per_watchlist UNIQUE (watchlist_id, ticker)
);

CREATE INDEX idx_watchlist_items_watchlist_id ON watchlist_items(watchlist_id);
CREATE INDEX idx_watchlist_items_ticker ON watchlist_items(ticker);
CREATE INDEX idx_watchlist_items_tags ON watchlist_items USING GIN(tags);

COMMENT ON TABLE watchlist_items IS 'Stocks within watchlists with targets and notes';
COMMENT ON COLUMN watchlist_items.added_price IS 'Stock price when added to watchlist';
COMMENT ON COLUMN watchlist_items.target_price IS 'User-defined price target';
COMMENT ON COLUMN watchlist_items.target_price_type IS 'Type of target: BUY, SELL, or ALERT';
COMMENT ON COLUMN watchlist_items.tags IS 'User-defined tags for categorization';

-- ============================================================================
-- WATCHLIST SNAPSHOTS TABLE
-- ============================================================================
-- Historical snapshots of watchlist performance
CREATE TABLE watchlist_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    total_value DECIMAL(20, 4) NOT NULL,
    avg_change_pct DECIMAL(10, 4),
    num_items INTEGER NOT NULL,
    snapshot_data JSONB, -- Detailed data: {ticker: {price, change, etc}}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_watchlist_snapshot_per_day UNIQUE (watchlist_id, snapshot_date)
);

CREATE INDEX idx_watchlist_snapshots_watchlist_id ON watchlist_snapshots(watchlist_id);
CREATE INDEX idx_watchlist_snapshots_date ON watchlist_snapshots(snapshot_date DESC);

COMMENT ON TABLE watchlist_snapshots IS 'Daily snapshots of watchlist performance';
COMMENT ON COLUMN watchlist_snapshots.snapshot_data IS 'JSONB with detailed stock data at snapshot time';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_snapshots ENABLE ROW LEVEL SECURITY;

-- Watchlists policies
CREATE POLICY "Users can view their own watchlists"
    ON watchlists FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own watchlists"
    ON watchlists FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watchlists"
    ON watchlists FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watchlists"
    ON watchlists FOR DELETE
    USING (auth.uid() = user_id);

-- Watchlist items policies
CREATE POLICY "Users can view items in their watchlists"
    ON watchlist_items FOR SELECT
    USING (watchlist_id IN (SELECT id FROM watchlists WHERE user_id = auth.uid()));

CREATE POLICY "Users can create items in their watchlists"
    ON watchlist_items FOR INSERT
    WITH CHECK (watchlist_id IN (SELECT id FROM watchlists WHERE user_id = auth.uid()));

CREATE POLICY "Users can update items in their watchlists"
    ON watchlist_items FOR UPDATE
    USING (watchlist_id IN (SELECT id FROM watchlists WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete items in their watchlists"
    ON watchlist_items FOR DELETE
    USING (watchlist_id IN (SELECT id FROM watchlists WHERE user_id = auth.uid()));

-- Watchlist snapshots policies
CREATE POLICY "Users can view snapshots of their watchlists"
    ON watchlist_snapshots FOR SELECT
    USING (watchlist_id IN (SELECT id FROM watchlists WHERE user_id = auth.uid()));

CREATE POLICY "Users can create snapshots of their watchlists"
    ON watchlist_snapshots FOR INSERT
    WITH CHECK (watchlist_id IN (SELECT id FROM watchlists WHERE user_id = auth.uid()));

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_watchlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_watchlists_timestamp ON watchlists;
CREATE TRIGGER update_watchlists_timestamp
    BEFORE UPDATE ON watchlists
    FOR EACH ROW
    EXECUTE FUNCTION update_watchlist_updated_at();

DROP TRIGGER IF EXISTS update_watchlist_items_timestamp ON watchlist_items;
CREATE TRIGGER update_watchlist_items_timestamp
    BEFORE UPDATE ON watchlist_items
    FOR EACH ROW
    EXECUTE FUNCTION update_watchlist_updated_at();

-- Function: Ensure only one default watchlist per user
CREATE OR REPLACE FUNCTION ensure_single_default_watchlist()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        -- Unset any existing default watchlists for this user
        UPDATE watchlists
        SET is_default = false
        WHERE user_id = NEW.user_id
          AND id != NEW.id
          AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_single_default_watchlist ON watchlists;
CREATE TRIGGER enforce_single_default_watchlist
    BEFORE INSERT OR UPDATE ON watchlists
    FOR EACH ROW
    WHEN (NEW.is_default = true)
    EXECUTE FUNCTION ensure_single_default_watchlist();

-- Function: Auto-create default watchlist for new users
CREATE OR REPLACE FUNCTION create_default_watchlist()
RETURNS TRIGGER AS $$
BEGIN
    -- Create a default "My Watchlist" for new users
    INSERT INTO watchlists (user_id, name, description, is_default, color)
    VALUES (
        NEW.id,
        'My Watchlist',
        'Default watchlist for tracking stocks',
        true,
        '#3b82f6'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default watchlist on user registration
DROP TRIGGER IF EXISTS create_default_watchlist_on_user_creation ON auth.users;
CREATE TRIGGER create_default_watchlist_on_user_creation
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_watchlist();

-- Function: Update item count when items are added/removed
CREATE OR REPLACE FUNCTION update_watchlist_item_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the watchlist's updated_at timestamp
    UPDATE watchlists
    SET updated_at = NOW()
    WHERE id = COALESCE(NEW.watchlist_id, OLD.watchlist_id);
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_watchlist_on_item_change ON watchlist_items;
CREATE TRIGGER update_watchlist_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON watchlist_items
    FOR EACH ROW
    EXECUTE FUNCTION update_watchlist_item_count();

-- Function: Capture added price when item is added
CREATE OR REPLACE FUNCTION set_added_price()
RETURNS TRIGGER AS $$
BEGIN
    -- If added_price is not set, try to fetch current price
    IF NEW.added_price IS NULL THEN
        -- In real implementation, you'd fetch from market data
        -- For now, set to NULL and let application handle it
        NEW.added_price = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_added_price_on_insert ON watchlist_items;
CREATE TRIGGER set_added_price_on_insert
    BEFORE INSERT ON watchlist_items
    FOR EACH ROW
    EXECUTE FUNCTION set_added_price();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: Watchlist summary with item counts
CREATE OR REPLACE VIEW watchlist_summary AS
SELECT 
    w.id,
    w.user_id,
    w.name,
    w.description,
    w.is_default,
    w.color,
    w.sort_order,
    w.created_at,
    w.updated_at,
    COUNT(wi.id) as item_count
FROM watchlists w
LEFT JOIN watchlist_items wi ON w.id = wi.watchlist_id
GROUP BY w.id;

COMMENT ON VIEW watchlist_summary IS 'Watchlists with item counts';

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Note: Default watchlist will be created automatically for each user via trigger

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables were created
DO $$
BEGIN
    -- Check if tables exist
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'watchlists') THEN
        RAISE EXCEPTION 'Migration failed: watchlists table not created';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'watchlist_items') THEN
        RAISE EXCEPTION 'Migration failed: watchlist_items table not created';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'watchlist_snapshots') THEN
        RAISE EXCEPTION 'Migration failed: watchlist_snapshots table not created';
    END IF;
    
    RAISE NOTICE 'Migration 008 completed successfully!';
    RAISE NOTICE 'Created tables: watchlists, watchlist_items, watchlist_snapshots';
    RAISE NOTICE 'Created view: watchlist_summary';
    RAISE NOTICE 'Created indexes, RLS policies, triggers, and functions';
    RAISE NOTICE 'Default watchlist will be auto-created for new users';
END $$;
