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
