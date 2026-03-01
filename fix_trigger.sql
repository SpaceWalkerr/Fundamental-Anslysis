-- =====================================================
-- FundaVision Database Setup - Complete Script
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- Step 1: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Drop existing function if it exists  
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 3: Create or update the function (with proper error handling)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN  
  INSERT INTO public.users (id, email, name, avatar_url, plan, reports_used, reports_limit)
  VALUES (
    NEW.id,    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'free',
    0,
    5
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth user creation
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 4: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;

-- Step 6: Verify setup
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Trigger setup complete!';
  RAISE NOTICE '   Function: public.handle_new_user()';
  RAISE NOTICE '   Trigger: on_auth_user_created';  
  RAISE NOTICE '   Target: auth.users';
  RAISE NOTICE '========================================';
END $$;

-- Step 7: Test query (optional - check if trigger exists)
SELECT 
  tgname AS trigger_name,
  tgenabled AS enabled,
  proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';
