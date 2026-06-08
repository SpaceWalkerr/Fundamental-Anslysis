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

DO $$
BEGIN
  RAISE NOTICE 'Migration 009 completed successfully: backend schema alignment applied.';
END $$;
