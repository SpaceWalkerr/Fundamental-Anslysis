"""
Check if the trigger and function exist in Supabase
"""
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

client = create_client(supabase_url, supabase_key)

print("🔍 Checking database triggers and functions...")

# Check if the function exists using pg_catalog
try:
    result = client.rpc('exec_sql', {
        'query': "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'handle_new_user'"
    }).execute()
    print(f"\n✅ Found function: {result.data}")
except Exception as e:
    print(f"\n⚠️  Cannot query via RPC: {e}")
    print("\nYou need to manually check in Supabase SQL Editor:")
    print("\nRun this query:")
    print("=" * 60)
    print("""
-- Check if function exists
SELECT routine_name, routine_schema 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'handle_new_user';

-- Check if trigger exists  
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
AND trigger_name = 'on_auth_user_created';

-- Check RLS policies on users table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'users';
""")
    print("=" * 60)

print("\n" + "=" * 60)
print("IMPORTANT: The trigger must exist on auth.users table!")
print("=" * 60)
print("\nIf the trigger doesn't exist, you need to run the SQL schema")
print("in Supabase Dashboard → SQL Editor")
print("\nFile: supabase-schema.sql (in root directory)")
print("\nMake sure to copy ALL the contents and run it in Supabase!")
