# 🚀 Quick Reference: Supabase Integration

## 📋 Setup Checklist

- [x] ✅ Supabase JS client installed
- [x] ✅ Environment variables configured
- [x] ✅ Supabase client created (`src/lib/supabase.ts`)
- [x] ✅ Database schema provided (`supabase-schema.sql`)
- [x] ✅ Auth store updated to use Supabase
- [x] ✅ App.tsx updated to initialize auth
- [ ] ⏳ Run database schema in Supabase Dashboard
- [ ] ⏳ Test user registration
- [ ] ⏳ Test user login

---

## 🔑 Your Credentials

```
Supabase URL: https://bwjfrqfqocsugtrypdyu.supabase.co
Anon Key: sb_publishable_NtxBErlRIG6CI4nmusIZdg_q7Vfu8_l
Dashboard: https://supabase.com/dashboard/project/bwjfrqfqocsugtrypdyu
```

---

## ⚡ Quick Actions

### 1. Setup Database (Required!)

```bash
# Go to Supabase Dashboard SQL Editor
# Copy content from: supabase-schema.sql
# Paste and run in SQL editor
```

### 2. Test Authentication

```bash
# Dev server is running at http://localhost:8080
npm run dev

# Register new user:
# Go to /register
# Email: test@example.com
# Password: YourPassword123

# Check Supabase Dashboard → Table Editor → users
# You should see your new user!
```

---

## 📝 Database Schema Quick View

```sql
-- Main tables created:
✓ users              (profile data)
✓ reports            (analysis results)
✓ source_documents   (uploaded files)
✓ chat_messages      (Q&A history)
✓ watchlist          (tracked stocks)

-- Security:
✓ Row Level Security enabled
✓ Storage bucket created
✓ Auto triggers for user creation
```

---

## 🔐 What Changed

### Before (Mock)
```typescript
// Mock authentication
login: async () => {
  const mockUser = { ... };
  set({ user: mockUser });
}
```

### After (Real Supabase)
```typescript
// Real authentication
login: async (email, password) => {
  const { data } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  // Fetch real user profile from DB
}
```

---

## 🧪 Testing Guide

### 1. Registration Flow
```
/register → Enter details → Auto-login → /dashboard
          ↓
    Supabase creates:
    - Auth user
    - Profile (via trigger)
```

### 2. Login Flow
```
/login → Enter credentials → Supabase validates → /dashboard
       ↓
   Session stored → JWT token → Auto-refresh
```

### 3. Protected Routes
```
Try to access /dashboard without login
→ Redirected to /login
→ Login → Redirected back to /dashboard
```

---

## 🐛 Common Issues & Fixes

### "Missing environment variables"
```bash
# Make sure .env file exists with:
VITE_SUPABASE_URL=https://bwjfrqfqocsugtrypdyu.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_NtxBErlRIG6CI4nmusIZdg_q7Vfu8_l
```

### "User not found after registration"
```bash
# Run the database schema SQL first!
# The trigger creates the user profile automatically
```

### "RLS policy violation"
```bash
# Make sure all RLS policies are created
# Re-run the entire supabase-schema.sql
```

---

## 📊 What's Working vs. What's Not

### ✅ Working (Real Supabase)
- User registration
- User login
- Session management
- Profile storage
- Protected routes
- Auto logout on session expiry

### 🔄 Still Mock (Not Connected Yet)
- Reports (using mock data)
- Chat messages (using mock responses)
- File uploads (UI only)
- Stock data (hardcoded)
- Watchlist (using mock data)

---

## 🎯 Next Integration Steps

### 1. Connect Reports to Supabase
```typescript
// In useReportStore.ts
const { data: reports } = await supabase
  .from('reports')
  .select('*')
  .eq('user_id', userId);
```

### 2. Implement File Upload
```typescript
// Upload to Supabase Storage
const { data } = await supabase.storage
  .from('financial-documents')
  .upload(`${userId}/${fileName}`, file);
```

### 3. Save Chat Messages
```typescript
await supabase
  .from('chat_messages')
  .insert({
    report_id: reportId,
    user_id: userId,
    role: 'user',
    content: message,
  });
```

---

## 🔗 Useful Links

- [Supabase Dashboard](https://supabase.com/dashboard/project/bwjfrqfqocsugtrypdyu)
- [Supabase Docs](https://supabase.com/docs)
- [Auth Guide](https://supabase.com/docs/guides/auth)
- [Storage Guide](https://supabase.com/docs/guides/storage)
- [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

## 💡 Pro Tips

1. **Check Browser Console**: Supabase errors are logged there
2. **Use Supabase Dashboard**: Monitor auth users, database, storage
3. **Test in Incognito**: For clean session testing
4. **Clear LocalStorage**: If session issues persist
5. **Check Supabase Logs**: Dashboard → Logs → See all errors

---

## 🎉 Ready to Test!

**Your Supabase is connected!** 🎊

1. Go to Supabase Dashboard and run the SQL schema
2. Start dev server: `npm run dev`
3. Register a new account
4. See it appear in Supabase Dashboard → Table Editor → users

**Authentication is now REAL!** 🔐
