-- ============================================
-- DATABASE MIGRATION: Add Custom Authentication
-- ============================================
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/YOUR_PROJECT/sql)

-- Step 1: Add password_hash column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Step 2: Disable Row Level Security for development
-- (In production, you'll want proper RLS policies based on JWT claims)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist DISABLE ROW LEVEL SECURITY;

-- Step 3: Remove the foreign key constraint to auth.users
-- (We're using custom JWT auth instead of Supabase Auth)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Step 4: Update id column to accept custom UUIDs
ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.users ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Verification query - should show the new password_hash column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;
