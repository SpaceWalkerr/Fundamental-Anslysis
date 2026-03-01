"""
Check users table schema
"""
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

client = create_client(supabase_url, supabase_key)

print("🔍 Checking users table schema...")

# Try to manually insert a test user profile
import uuid
test_id = str(uuid.uuid4())
test_email = "schematest@example.com"

print(f"\n📝 Attempting manual insert with ID: {test_id}")

try:
    result = client.table('users').insert({
        "id": test_id,
        "email": test_email,
        "name": "Schema Test",
        "avatar_url": None,
        "plan": "free",
        "reports_used": 0,
        "reports_limit": 5
    }).execute()
    
    print(f"✅ Manual insert successful!")
    print(f"   Data: {result.data}")
    
    # Cleanup
    client.table('users').delete().eq('id', test_id).execute()
    print(f"🗑️  Test record cleaned up")
    
except Exception as e:
    print(f"❌ Manual insert failed: {e}")
    import traceback
    traceback.print_exc()

print("\n🔍 Checking for RLS policy issues...")

# Try with service role key (should bypass RLS)
print("Using service role key - should have full access")

print("\n" + "="*50)
print("Schema check complete!")
print("\nIf manual insert works but trigger doesn't,")
print("the issue is with the trigger or auth.users permissions")
