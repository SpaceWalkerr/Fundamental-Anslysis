# 🚀 Deployment Guide

## Overview
- **Frontend**: Deploy to Vercel
- **Backend**: Deploy to Render
- **Database**: Already hosted on Supabase

---

## 📋 Prerequisites

1. **Git Repository**
   - Create a GitHub/GitLab repository
   - Push your code to the repository

2. **Accounts**
   - [Vercel Account](https://vercel.com) (for frontend)
   - [Render Account](https://render.com) (for backend)
   - Supabase (already set up)

---

## 🎨 Frontend Deployment (Vercel)

### Step 1: Prepare Frontend

Your frontend is already configured with:
- `vercel.json` - Vercel configuration
- `package.json` - Dependencies
- `.env` - Environment variables (don't commit this!)

### Step 2: Deploy to Vercel

**Option A: Using Vercel CLI**
```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to project root
cd "/Users/suraj/Desktop/Fundamental Anslysis"

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: fundavision (or your choice)
# - Directory: ./ (current directory)
# - Override settings? No
```

**Option B: Using Vercel Dashboard**
1. Go to https://vercel.com
2. Click **"New Project"**
3. Import your Git repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add Environment Variables:
   - `VITE_API_URL` = `https://your-backend.onrender.com` (we'll get this from Render)
   - `VITE_SUPABASE_URL` = `https://dpmicndslhinabslkdxy.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
6. Click **"Deploy"**

### Step 3: Update Backend URL
After deploying backend to Render (next section), update:
- Vercel Environment Variable: `VITE_API_URL` → Render backend URL
- Redeploy frontend

---

## ⚙️ Backend Deployment (Render)

### Step 1: Prepare Backend

Your `render.yaml` is already configured. Just verify these files exist:
- `backend/requirements.txt` ✅
- `backend/runtime.txt` ✅
- `backend/start.sh` ✅
- `render.yaml` ✅

### Step 2: Create `.env` Template

Create `backend/.env.example` (for reference, don't include real keys):
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
SECRET_KEY=your_secret_key
OPENAI_API_KEY=your_openai_key
CORS_ORIGINS=https://your-frontend.vercel.app
```

### Step 3: Deploy to Render

**Option A: Using Render Dashboard**
1. Go to https://render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your Git repository
4. Configure:
   - **Name**: fundavision-backend
   - **Region**: Choose closest to you
   - **Branch**: main (or master)
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `sh start.sh`
   - **Plan**: Free (or paid for better performance)

5. **Environment Variables** (Add these):
   ```
   SUPABASE_URL=https://dpmicndslhinabslkdxy.supabase.co
   SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwbWljbmRzbGhpbmFic2xrZHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MjA3NTIsImV4cCI6MjA4ODM5Njc1Mn0.uxoa2OIM4ga4G-oIGldFuFTm3QCm55ReM2yH6xCHRX0
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SECRET_KEY=09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7
   OPENAI_API_KEY=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
   CORS_ORIGINS=https://your-app.vercel.app,http://localhost:5173
   API_PORT=8080
   ENVIRONMENT=production
   DEBUG=False
   ```

6. Click **"Create Web Service"**

7. Wait for deployment (5-10 minutes)

8. Copy your backend URL: `https://fundavision-backend.onrender.com`

**Option B: Using render.yaml (Blueprint)**
1. Push `render.yaml` to your repo
2. In Render Dashboard, click **"New +"** → **"Blueprint"**
3. Connect repository
4. Render will auto-configure from `render.yaml`
5. Add environment variables manually

### Step 4: Update CORS Origins
After deploying frontend, update backend environment variable:
```
CORS_ORIGINS=https://your-frontend.vercel.app
```

---

## 🔄 Update Frontend with Backend URL

1. Go to Vercel Dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Update `VITE_API_URL` to your Render backend URL:
   ```
   VITE_API_URL=https://fundavision-backend.onrender.com
   ```
5. Go to **Deployments** tab
6. Click **"..."** on latest deployment → **"Redeploy"**

---

## ✅ Verification Checklist

After deployment:

**Frontend (Vercel)**
- [ ] Site loads at `https://your-app.vercel.app`
- [ ] Login page works
- [ ] Can authenticate
- [ ] API calls work (check browser Network tab)

**Backend (Render)**
- [ ] API health check: `https://your-backend.onrender.com/`
- [ ] API docs: `https://your-backend.onrender.com/api/docs`
- [ ] Stock screener endpoint works

**Database (Supabase)**
- [ ] Backend can connect
- [ ] 86 stocks available
- [ ] User authentication works

---

## 🐛 Troubleshooting

### Frontend Issues

**CORS Error**
- Update backend `CORS_ORIGINS` to include Vercel URL
- Redeploy backend

**API Connection Failed**
- Check `VITE_API_URL` in Vercel environment variables
- Ensure backend URL is correct (include https://)
- Verify backend is running

### Backend Issues

**Build Failed**
- Check `requirements.txt` has all dependencies
- Verify Python version in `runtime.txt`

**Service Won't Start**
- Check Render logs
- Verify environment variables are set
- Check `start.sh` has correct command

**Database Connection Error**
- Verify Supabase credentials in environment variables
- Check Supabase is accessible

---

## 🔐 Security Notes

Before deploying:

1. **Never commit `.env` files** - They're in `.gitignore`
2. **Use environment variables** for all secrets
3. **Rotate API keys** if accidentally committed
4. **Enable CORS** only for your frontend domain
5. **Use HTTPS** for all production traffic

---

## 📊 Monitoring

**Vercel**
- Analytics: Available in dashboard
- Logs: Real-time function logs

**Render**
- Logs: Available in dashboard
- Metrics: CPU, Memory usage
- Alerts: Set up email notifications

**Supabase**
- Database metrics in dashboard
- API usage tracking

---

## 🔄 CI/CD (Automatic Deployments)

Both Vercel and Render support auto-deployment:

1. **Push to Git** → Automatic deployment
2. **Preview Deployments** - Each PR gets a preview URL
3. **Production Branch** - Deploys to production (usually `main`)

Configure in:
- Vercel: Settings → Git
- Render: Settings → Auto-Deploy

---

## 💰 Cost Estimates

**Free Tier Limits:**

**Vercel**
- Bandwidth: 100 GB/month
- Builds: 6000 minutes/month
- Serverless Functions: 100 GB-hours

**Render**
- Free Web Service: Spins down after 15 min inactivity
- 750 hours/month free
- Restart takes ~30 seconds

**Supabase**
- 500 MB database
- 2 GB file storage
- 50 K Monthly Active Users

**Upgrade if:**
- Need faster cold starts → Render paid ($7/month)
- More compute → Render Pro ($25/month)
- Higher limits → Vercel Pro ($20/month)

---

## 📞 Support

- Vercel Docs: https://vercel.com/docs
- Render Docs: https://render.com/docs
- Supabase Docs: https://supabase.com/docs

---

## 🎉 You're Done!

Your app is now live at:
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-backend.onrender.com`
- Database: `https://dpmicndslhinabslkdxy.supabase.co`

Share the frontend URL with users! 🚀
