"""
Test database connection and verify schema
"""
import os
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

print(f"Connecting to: {supabase_url}")

client = create_client(supabase_url, supabase_key)

print("\n✅ Connected to Supabase!")

# Test 1: Check if users table exists
print("\n🔍 Testing users table...")
try:
    result = client.table('users').select('*').limit(1).execute()
    print(f"✅ Users table exists! Found {len(result.data)} rows")
except Exception as e:
    print(f"❌ Error accessing users table: {e}")

# Test 2: Check auth.users
print("\n🔍 Testing auth system...")
try:
    # Try to list auth users (requires service key)
    users = client.auth.admin.list_users()
    print(f"✅ Auth system working! Found {len(users)} auth users")
    for user in users[:3]:  # Show first 3
        print(f"   - {user.email} (ID: {user.id})")
except Exception as e:
    print(f"❌ Error accessing auth users: {e}")

# Test 3: Check if trigger exists
print("\n🔍 Checking database triggers...")
try:
    result = client.rpc('pg_get_triggerdef', {'triggeroid': 'on_auth_user_created'}).execute()
    print(f"✅ Trigger exists!")
except Exception as e:
    print(f"⚠️  Cannot verify trigger (may not exist): {e}")

# Test 4: Try to create a test user
print("\n🧪 Testing user registration flow...")
try:
    test_email = "dbtest@example.com"
    
    # First, check if user already exists and delete
    try:
        existing = client.auth.admin.list_users()
        for user in existing:
            if user.email == test_email:
                print(f"🗑️  Deleting existing test user: {user.id}")
                client.auth.admin.delete_user(user.id)
    except:
        pass
    
    # Try to create a test user
    print(f"📝 Creating test user: {test_email}")
    auth_response = client.auth.sign_up({
        "email": test_email,
        "password": "TestPassword123",
        "options": {
            "data": {
                "name": "DB Test User"
            }
        }
    })
    
    if auth_response.user:
        user_id = auth_response.user.id
        print(f"✅ Auth user created! ID: {user_id}")
        
        # Check if profile was created in users table
        import time
        time.sleep(1)  # Wait for trigger to fire
        
        profile = client.table('users').select('*').eq('id', user_id).execute()
        
        if profile.data:
            print(f"✅ User profile created automatically by trigger!")
            print(f"   Name: {profile.data[0].get('name')}")
            print(f"   Email: {profile.data[0].get('email')}")
            print(f"   Plan: {profile.data[0].get('plan')}")
        else:
            print(f"❌ User profile NOT created! Trigger may not be working.")
            print(f"   Attempting manual insert...")
            
            manual_profile = {
                "id": user_id,
                "email": test_email,
                "name": "DB Test User",
                "plan": "free",
                "reports_used": 0,
                "reports_limit": 5,
            }
            insert_result = client.table('users').insert(manual_profile).execute()
            print(f"✅ Manual insert successful!")
        
        # Cleanup
        print(f"🗑️  Cleaning up test user...")
        client.auth.admin.delete_user(user_id)
        print(f"✅ Test complete!")
        
    else:
        print(f"❌ Failed to create auth user")
        
except Exception as e:
    print(f"❌ Error during test: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "="*50)
print("Database test complete!")
