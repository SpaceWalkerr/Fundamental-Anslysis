"""
Check what's in the users table
"""
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

client = create_client(supabase_url, supabase_key)

print("🔍 Checking users table...")
result = client.table('users').select('*').execute()

print(f"\nFound {len(result.data)} rows in users table:")
for user in result.data:
    print(f"\nUser:")
    print(f"  ID: {user.get('id')}")
    print(f"  Email: {user.get('email')}")
    print(f"  Name: {user.get('name')}")
    print(f"  Plan: {user.get('plan')}")
    print(f"  Created: {user.get('created_at')}")

print("\n🔍 Checking auth.users...")
try:
    auth_users = client.auth.admin.list_users()
    print(f"\nFound {len(auth_users)} auth users:")
    for user in auth_users:
        print(f"  - {user.email} (ID: {user.id})")
except Exception as e:
    print(f"Error: {e}")

# Check if the user ID in users table exists in auth.users
print("\n🔍 Checking for orphaned users...")
for user in result.data:
    user_id = user.get('id')
    try:
        auth_user = client.auth.admin.get_user_by_id(user_id)
        if auth_user:
            print(f"✅ User {user.get('email')} has matching auth user")
        else:
            print(f"❌ User {user.get('email')} is orphaned (no auth user)")
    except Exception as e:
        print(f"❌ User {user.get('email')} is orphaned: {e}")
