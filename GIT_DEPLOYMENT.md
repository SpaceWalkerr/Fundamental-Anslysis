# 🚀 Git Deployment Checklist

Quick checklist before pushing to GitHub and deploying.

## ✅ Pre-Deployment Checklist

### 1. Environment Files
- [ ] `.env` is in `.gitignore` (verified ✅)
- [ ] `.env.example` has all required variables
- [ ] `backend/.env` is in `.gitignore` (verified ✅)
- [ ] `backend/.env.example` has all required variables

### 2. Secrets & Keys
- [ ] No API keys committed in code
- [ ] No passwords in configuration files
- [ ] No Supabase keys hardcoded
- [ ] JWT secrets not exposed

### 3. Code Quality
- [ ] No console.logs in production code (or minimal)
- [ ] No commented-out code blocks
- [ ] No TODO comments for critical items
- [ ] Error handling implemented

### 4. Dependencies
- [ ] All dependencies in `package.json`
- [ ] All dependencies in `requirements.txt`
- [ ] No unused dependencies
- [ ] Lock files updated (`package-lock.json`, `bun.lockb`)

### 5. Documentation
- [ ] README.md is complete
- [ ] DEPLOYMENT.md has deployment steps
- [ ] API endpoints documented
- [ ] Environment variables documented

### 6. Git Configuration
- [ ] `.gitignore` properly configured
- [ ] `.gitattributes` added
- [ ] Large files not tracked
- [ ] Binary files properly handled

## 🔄 Git Deployment Steps

### Step 1: Initial Setup (if not done)
```bash
cd "/Users/suraj/Desktop/Fundamental Anslysis"
git init
git branch -M main
```

### Step 2: Review Changes
```bash
# Check what will be committed
git status

# Review ignored files
git status --ignored

# Check for large files
find . -type f -size +5M ! -path "*/node_modules/*" ! -path "*/.git/*"
```

### Step 3: Add Files
```bash
# Add all files (respecting .gitignore)
git add .

# Verify what's staged
git status
```

### Step 4: Commit
```bash
git commit -m "Initial commit - Production ready

- Frontend: React + Vite + TypeScript
- Backend: FastAPI + Python
- Database: Supabase PostgreSQL
- Features: AI analysis, portfolios, watchlists, alerts
- Deployment configs: Vercel + Render
"
```

### Step 5: Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `fundamental-analysis` (or your choice)
3. Description: "AI-powered financial analysis platform"
4. Keep it **Private** initially (or Public if you want)
5. DON'T initialize with README (we have one)
6. Click "Create repository"

### Step 6: Push to GitHub
```bash
# Add remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push to GitHub
git push -u origin main
```

### Step 7: Verify on GitHub
1. Go to your repository on GitHub
2. Check all files are present
3. Verify .env files are NOT visible
4. Check documentation renders correctly

## 🌐 Deploy to Vercel (Frontend)

### Option 1: Dashboard (Recommended)
1. Go to https://vercel.com
2. Click "Add New..." > "Project"
3. Import your GitHub repository
4. Vercel auto-detects Vite configuration
5. Add environment variables:
   - `VITE_API_URL` → (will be backend URL after Render deploy)
   - `VITE_SUPABASE_URL` → Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` → Your Supabase anon key
6. Click "Deploy"
7. Wait for deployment (1-2 minutes)
8. Get your Vercel URL: `https://your-app.vercel.app`

### Option 2: CLI
```bash
npm i -g vercel
vercel login
vercel --prod
```

## 🔧 Deploy to Render (Backend)

### Prerequisites
- Push code to GitHub first
- Have Supabase credentials ready
- Have API keys ready (OpenAI, stock data, etc.)

### Steps:
1. Go to https://render.com
2. Click "New +" > "Web Service"
3. Connect your GitHub repository
4. Configure service:
   - **Name:** `fundamental-analysis-api`
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add ALL environment variables from `backend/.env.example`
6. Click "Create Web Service"
7. Wait for deployment (3-5 minutes)
8. Get your Render URL: `https://your-api.onrender.com`

### Update Frontend with Backend URL
1. Go back to Vercel > Your Project > Settings > Environment Variables
2. Update `VITE_API_URL` to your Render URL
3. Trigger redeploy in Vercel

## 🗄️ Set Up Supabase Database

If you haven't already:
1. Create Supabase project at https://supabase.com
2. Go to SQL Editor
3. Copy contents of `COMPLETE_SETUP.sql`
4. Paste and execute
5. Verify tables created in Table Editor
6. Go to Authentication > Settings
7. Add redirect URLs:
   - `https://your-app.vercel.app/*`
   - `http://localhost:5173/*`
8. Disable email confirmation (or set up SMTP)

## ✅ Post-Deployment Verification

### 1. Test Frontend
- [ ] Landing page loads
- [ ] Can navigate to signup/login
- [ ] No console errors
- [ ] Assets load correctly

### 2. Test Backend
```bash
# Health check
curl https://your-api.onrender.com/health

# API docs accessible
open https://your-api.onrender.com/docs
```

### 3. Test Authentication
- [ ] Can register new user
- [ ] Can login
- [ ] Token generation works
- [ ] Protected routes work

### 4. Test Core Features
- [ ] Upload document
- [ ] Generate report
- [ ] Chat with document
- [ ] Create portfolio
- [ ] Create watchlist
- [ ] Set price alert

## 🐛 Troubleshooting

### Issue: "Module not found" errors
**Solution:** Check all imports use relative paths, verify dependencies installed

### Issue: CORS errors
**Solution:** Update `allow_origins` in `backend/app/main.py` with Vercel domain

### Issue: Environment variables not working
**Solution:** Redeploy after adding env vars, check variable names match exactly

### Issue: Database connection failed
**Solution:** Verify Supabase credentials, check database is not paused

### Issue: API endpoints return 404
**Solution:** Check Render deployment logs, verify start command is correct

## 📊 Monitor Your Deployment

### Vercel
- Dashboard: https://vercel.com/dashboard
- Analytics: Enable in project settings
- Logs: Deployments > [Latest] > Function Logs

### Render
- Dashboard: https://dashboard.render.com
- Logs: [Your Service] > Logs tab
- Metrics: [Your Service] > Metrics tab

### Supabase
- Dashboard: https://supabase.com/dashboard
- Database: Table Editor
- Auth Users: Authentication > Users
- Logs: Logs Explorer

## 🎉 Done!

Your application is now live:
- **Frontend:** https://your-app.vercel.app
- **Backend:** https://your-api.onrender.com
- **API Docs:** https://your-api.onrender.com/docs

Share your app with users and start collecting feedback!

---

**Need Help?**
- See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions
- Check [README.md](README.md) for project overview
- Review logs in Vercel/Render dashboards
- Check Supabase database logs

**Next Steps:**
- Set up custom domain
- Configure monitoring (Sentry, LogRocket)
- Set up analytics
- Plan scaling strategy
- Optimize performance
