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
