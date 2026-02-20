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
