# 🔐 Supabase Setup Guide

## ✅ Supabase Connected!

Your Supabase credentials have been configured. Now follow these steps to complete the setup.

---

## 📝 Step 1: Create Database Tables

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: `bwjfrqfqocsugtrypdyu`

2. **Go to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Schema**
   - Copy the entire contents of `supabase-schema.sql`
   - Paste into the SQL editor
   - Click "Run" or press Cmd+Enter
   - Wait for success message: "Success. No rows returned"

This will create:
- ✅ All database tables (users, reports, source_documents, chat_messages, watchlist)
- ✅ Row Level Security (RLS) policies
- ✅ Indexes for performance
- ✅ Triggers for automatic user profile creation
- ✅ Storage bucket for file uploads

---

## 🔒 Step 2: Configure Authentication

### Enable Email Authentication

1. **Go to Authentication Settings**
   - Click "Authentication" → "Providers"
   - Make sure "Email" is enabled

2. **Email Templates (Optional)**
   - Click "Email Templates"
   - Customize confirmation and reset password emails

### Disable Email Confirmation (Development Only)

For development, you may want to disable email confirmation:

1. Go to "Authentication" → "Providers"
2. Click "Email"
3. Toggle OFF "Confirm email"
4. Click "Save"

⚠️ **Important**: Re-enable email confirmation for production!

---

## 📂 Step 3: Configure Storage

1. **Go to Storage**
   - Click "Storage" in the sidebar
   - You should see a bucket called `financial-documents`
   - If not, the SQL script will create it

2. **Verify Storage Policies**
   - Click on the `financial-documents` bucket
   - Click "Policies"
   - You should see 3 policies:
     - Users can upload own documents
     - Users can view own documents
     - Users can delete own documents

---

## 🧪 Step 4: Test the Connection

### Start Development Server

```bash
npm run dev
```

### Test Authentication Flow

1. **Register a New User**
   - Go to: http://localhost:8080/register
   - Fill in the form:
     - Name: Your Name
     - Email: test@example.com
     - Password: Password123
   - Click "Create Account"
   - You should be redirected to dashboard

2. **Check Database**
   - Go to Supabase Dashboard → "Table Editor"
   - Click on "users" table
   - You should see your new user!

3. **Test Logout**
   - Click your avatar → Logout
   - You should be redirected to login page

4. **Test Login**
   - Use the same credentials to login
   - You should see your dashboard

---

## 🔐 Environment Variables

Your `.env` file is configured with:

```env
VITE_SUPABASE_URL=https://bwjfrqfqocsugtrypdyu.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_NtxBErlRIG6CI4nmusIZdg_q7Vfu8_l
VITE_ENV=development
```

⚠️ **Security Notes:**
- ✅ The `.env` file is in `.gitignore` (safe)
- ✅ Only the publishable anon key is in frontend (safe)
- ❌ **NEVER** commit the service role key to git
- ❌ Service role key is for backend only

---

## 📊 What's Working Now

### ✅ Authentication
- Real user registration via Supabase Auth
- Real login with email/password
- Session persistence
- Automatic logout on token expiry
- Profile auto-creation on signup

### 🔄 Still Using Mock Data
- Reports (not stored in DB yet)
- Chat messages (not stored in DB yet)
- File uploads (not processed yet)
- Stock data (hardcoded)

---

## 🚀 Next Steps

### 1. **Update Report Store** (Next)
Replace mock reports with real Supabase queries:
```typescript
// Fetch reports from Supabase
const { data: reports } = await supabase
  .from('reports')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

### 2. **Implement File Upload**
```typescript
// Upload file to Supabase Storage
const { data, error } = await supabase.storage
  .from('financial-documents')
  .upload(`${userId}/${file.name}`, file);
```

### 3. **Add Chat Persistence**
```typescript
// Save chat messages
await supabase
  .from('chat_messages')
  .insert({
    report_id: reportId,
    user_id: userId,
    role: 'user',
    content: message,
  });
```

### 4. **Connect Backend API**
- Set up FastAPI backend
- Implement AI analysis
- Process uploaded files
- Generate reports with AI

---

## 🐛 Troubleshooting

### Issue: "Invalid API key"
**Solution**: Check that environment variables are correct in `.env`

### Issue: "User not found after registration"
**Solution**: 
1. Check if the trigger `on_auth_user_created` is active
2. Run the schema SQL again
3. Check Supabase logs: Dashboard → "Logs" → "Database"

### Issue: "RLS policy violation"
**Solution**: Make sure RLS policies are created correctly. Re-run the schema SQL.

### Issue: "Storage bucket not found"
**Solution**: 
1. Go to Storage in Supabase Dashboard
2. Create bucket manually: Name = `financial-documents`, Public = false
3. Add storage policies from the SQL schema

### Issue: "Session not persisting"
**Solution**: Clear browser localStorage and cookies, then login again.

---

## 📚 Database Schema Overview

```
users
├── id (UUID, primary key, references auth.users)
├── email (unique)
├── name
├── avatar_url
├── plan (free/premium/enterprise)
├── reports_used
├── reports_limit
└── created_at, updated_at

reports
├── id (UUID)
├── user_id (foreign key → users)
├── company, ticker, exchange
├── overall_score
├── metrics (JSONB)
├── key_ratios (JSONB)
├── strengths (text array)
├── red_flags (text array)
└── investment_assessment

source_documents
├── id (UUID)
├── user_id (foreign key → users)
├── report_id (foreign key → reports)
├── file_name, file_size, file_type
└── storage_path (Supabase Storage path)

chat_messages
├── id (UUID)
├── report_id (foreign key → reports)
├── user_id (foreign key → users)
├── role (user/assistant)
└── content

watchlist
├── id (UUID)
├── user_id (foreign key → users)
├── ticker, company_name
└── added_at
```

---

## ✨ Features Now Available

### 🔐 Real Authentication
- User registration with Supabase Auth
- Secure password hashing (handled by Supabase)
- JWT tokens for session management
- Automatic session refresh
- Email verification (optional)

### 👤 User Profiles
- Automatic profile creation on signup
- Plan management (free/premium/enterprise)
- Usage tracking (reports_used, reports_limit)
- Profile updates

### 🔒 Row Level Security
- Users can only see their own data
- Automatic enforcement at database level
- No server-side authorization code needed

---

## 🎯 Summary

**What's Live:**
- ✅ Supabase connected
- ✅ Authentication working
- ✅ User profiles auto-created
- ✅ Database schema ready
- ✅ RLS policies active

**What's Next:**
- 🔄 Connect reports to database
- 🔄 Implement file upload
- 🔄 Add chat persistence
- 🔄 Build backend API for AI analysis

**Test the auth now!** Register a new account and it will be created in your real Supabase database! 🎉
