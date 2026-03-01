"""
Verify trigger was created properly
"""
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

client = create_client(supabase_url, supabase_key)

print("🔍 Checking if trigger exists...")

# Try to query pg_trigger to check if the trigger exists
try:
    # Use raw SQL query via RPC if available, or we'll need to check differently
    result = client.table('users').select('*').limit(1).execute()
    print(f"✅ Users table is accessible")
except Exception as e:
    print(f"❌ Error: {e}")

print("\n🧪 Attempting manual user creation test...")

# Try to create auth user and see the detailed error
try:
    test_email = f"test{os.urandom(4).hex()}@example.com"
    print(f"📝 Creating test user: {test_email}")
    
    response = client.auth.sign_up({
        "email": test_email,
        "password": "TestPassword123",
        "options": {
            "data": {
                "name": "Test User"
            }
        }
    })
    
    if response.user:
        print(f"✅ User created successfully!")
        print(f"   User ID: {response.user.id}")
        print(f"   Email: {response.user.email}")
        
        # Wait a moment for trigger
        import time
        time.sleep(2)
        
        # Check if profile was created
        profile = client.table('users').select('*').eq('id', response.user.id).execute()
        if profile.data:
            print(f"✅ Profile created by trigger!")
            print(f"   Name: {profile.data[0]['name']}")
            print(f"   Plan: {profile.data[0]['plan']}")
        else:
            print(f"❌ Profile was NOT created - trigger failed!")
            
        # Cleanup
        client.auth.admin.delete_user(response.user.id)
        print(f"🗑️  Test user cleaned up")
    else:
        print(f"❌ Failed to create user")
        print(f"   Response: {response}")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "="*50)
print("Trigger verification complete!")
