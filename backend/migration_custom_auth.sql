-- Migration: Switch from Supabase Auth to custom JWT auth
-- Run this migration to update the users table for custom authentication

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Step 2: Add password_hash column
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Step 3: Make id a regular UUID (not referencing auth.users)
-- The column already exists, so we just need to ensure it can accept any UUID
ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.users ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Step 4: Update RLS policies to work without auth.uid()
-- Drop old policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can insert own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can update own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can delete own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can view own source documents" ON public.source_documents;
DROP POLICY IF EXISTS "Users can insert own source documents" ON public.source_documents;
DROP POLICY IF EXISTS "Users can delete own source documents" ON public.source_documents;
DROP POLICY IF EXISTS "Users can view own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view own watchlist" ON public.watchlist;
DROP POLICY IF EXISTS "Users can manage own watchlist" ON public.watchlist;

-- For now, disable RLS while we're in development
-- In production, you would create service role policies or use JWT claims
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist DISABLE ROW LEVEL SECURITY;

-- Note: This migration makes the database accessible via service role key
-- Ensure your backend validates JWT tokens before allowing any operations
