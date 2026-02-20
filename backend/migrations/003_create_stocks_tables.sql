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
