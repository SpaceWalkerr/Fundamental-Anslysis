-- Migration 009: Backend/schema alignment fixes
-- Description: Add columns and policies required by the current FastAPI backend.

-- Uploaded documents store extracted text and parser metadata before analysis.
ALTER TABLE public.source_documents
  ADD COLUMN IF NOT EXISTS extracted_text TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.source_documents.extracted_text IS 'Text extracted from the uploaded source document for analysis and RAG.';
COMMENT ON COLUMN public.source_documents.metadata IS 'Parser metadata such as page count, sheets, tables, and extraction stats.';

-- Reports store the AI result in analysis_result. Keep report_data as a compatibility
-- alias for older frontend/report code paths.
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS report_data JSONB;

COMMENT ON COLUMN public.reports.report_data IS 'Compatibility field for rendered report payloads; prefer analysis_result for new writes.';

-- Stock scanner tables are read and written only through the backend, but enabling
-- RLS keeps direct Supabase access locked down if the anon key is used in clients.
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screening_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read active stocks" ON public.stocks;
DROP POLICY IF EXISTS "Users can view own saved screens" ON public.saved_screens;
DROP POLICY IF EXISTS "Users can create own saved screens" ON public.saved_screens;
DROP POLICY IF EXISTS "Users can update own saved screens" ON public.saved_screens;
DROP POLICY IF EXISTS "Users can delete own saved screens" ON public.saved_screens;

CREATE POLICY "Authenticated users can read active stocks"
  ON public.stocks FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Users can view own saved screens"
  ON public.saved_screens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own saved screens"
  ON public.saved_screens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved screens"
  ON public.saved_screens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved screens"
  ON public.saved_screens FOR DELETE
  USING (auth.uid() = user_id);

-- Enable RLS and add policies for tables created in 004 (Realtime Features)
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intraday_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own price alerts" ON public.price_alerts;
DROP POLICY IF EXISTS "Users can create own price alerts" ON public.price_alerts;
DROP POLICY IF EXISTS "Users can update own price alerts" ON public.price_alerts;
DROP POLICY IF EXISTS "Users can delete own price alerts" ON public.price_alerts;

CREATE POLICY "Users can view own price alerts"
  ON public.price_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own price alerts"
  ON public.price_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own price alerts"
  ON public.price_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own price alerts"
  ON public.price_alerts FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can read price history" ON public.price_history;
CREATE POLICY "Authenticated users can read price history"
  ON public.price_history FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can read intraday prices" ON public.intraday_prices;
CREATE POLICY "Authenticated users can read intraday prices"
  ON public.intraday_prices FOR SELECT
  TO authenticated
  USING (true);

-- Enable RLS and add policies for tables created in 005 (Technical Indicators)
ALTER TABLE public.technical_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read technical indicators" ON public.technical_indicators;
CREATE POLICY "Authenticated users can read technical indicators"
  ON public.technical_indicators FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can read trading signals" ON public.trading_signals;
CREATE POLICY "Authenticated users can read trading signals"
  ON public.trading_signals FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can view own signal alerts" ON public.signal_alerts;
DROP POLICY IF EXISTS "Users can create own signal alerts" ON public.signal_alerts;
DROP POLICY IF EXISTS "Users can update own signal alerts" ON public.signal_alerts;
DROP POLICY IF EXISTS "Users can delete own signal alerts" ON public.signal_alerts;

CREATE POLICY "Users can view own signal alerts"
  ON public.signal_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own signal alerts"
  ON public.signal_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own signal alerts"
  ON public.signal_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own signal alerts"
  ON public.signal_alerts FOR DELETE
  USING (auth.uid() = user_id);

-- Fix: Recreate handle_new_user function with SECURITY DEFINER and search_path = public
-- This ensures that any nested triggers and table creations execute with public schema access.
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop all old and potential duplicate triggers on auth.users and public.users to clear leftover states
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS create_default_watchlist_on_user_creation ON auth.users;
DROP TRIGGER IF EXISTS create_default_watchlist ON auth.users;
DROP TRIGGER IF EXISTS create_watchlist_on_signup ON auth.users;

DROP TRIGGER IF EXISTS create_default_watchlist_on_user_creation ON public.users;
DROP TRIGGER IF EXISTS create_default_watchlist ON public.users;

-- Recreate primary auth trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fix: Recreate watchlist creation function with SECURITY DEFINER and explicit search_path
-- This fixes the registration error "Database error saving new user" in Supabase Auth.
CREATE OR REPLACE FUNCTION public.create_default_watchlist()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.watchlists (user_id, name, description, is_default, color)
    VALUES (
        NEW.id,
        'My Watchlist',
        'Default watchlist for tracking stocks',
        true,
        '#3b82f6'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS create_default_watchlist_on_user_creation ON auth.users;
DROP TRIGGER IF EXISTS create_default_watchlist_on_user_creation ON public.users;
CREATE TRIGGER create_default_watchlist_on_user_creation
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_default_watchlist();

-- Fix: Recreate ensure_single_default_watchlist function with SECURITY DEFINER and search_path = public
CREATE OR REPLACE FUNCTION public.ensure_single_default_watchlist()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE public.watchlists
        SET is_default = false
        WHERE user_id = NEW.user_id
          AND id != NEW.id
          AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS enforce_single_default_watchlist ON public.watchlists;
CREATE TRIGGER enforce_single_default_watchlist
    BEFORE INSERT OR UPDATE ON public.watchlists
    FOR EACH ROW
    WHEN (NEW.is_default = true)
    EXECUTE FUNCTION public.ensure_single_default_watchlist();

-- Recreate view with security_invoker = true to satisfy Supabase Advisor security requirements
DROP VIEW IF EXISTS public.watchlist_summary CASCADE;
CREATE OR REPLACE VIEW public.watchlist_summary 
WITH (security_invoker = true) AS
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
FROM public.watchlists w
LEFT JOIN public.watchlist_items wi ON w.id = wi.watchlist_id
GROUP BY w.id;

DO $$
BEGIN
  RAISE NOTICE 'Migration 009 completed successfully: backend schema alignment applied.';
END $$;

