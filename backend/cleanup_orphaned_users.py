"""
Clean up orphaned users from the users table
"""
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

client = create_client(supabase_url, supabase_key)

print("🗑️  Cleaning up orphaned users...")

# Get all users from users table
result = client.table('users').select('*').execute()

print(f"\nFound {len(result.data)} users in users table")

for user in result.data:
    user_id = user.get('id')
    email = user.get('email')
    
    # Check if this user exists in auth.users
    try:
        auth_user = client.auth.admin.get_user_by_id(user_id)
        if auth_user:
            print(f"✅ Keeping {email} - has auth user")
        else:
            print(f"❌ Deleting {email} - no auth user")
            client.table('users').delete().eq('id', user_id).execute()
            print(f"   Deleted!")
    except Exception as e:
        print(f"❌ Deleting {email} - orphaned ({e})")
        try:
            client.table('users').delete().eq('id', user_id).execute()
            print(f"   Deleted!")
        except Exception as del_error:
            print(f"   Error deleting: {del_error}")

print("\n✅ Cleanup complete!")

# Verify
result = client.table('users').select('*').execute()
print(f"\nUsers table now has {len(result.data)} rows")
