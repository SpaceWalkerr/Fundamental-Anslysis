# 🚀 Deployment Checklist

## ✅ Pre-Deployment (COMPLETED)

- [x] Removed test files
- [x] Cleaned Python cache
- [x] Updated .gitignore
- [x] Created deployment guides
- [x] Added .gitkeep files for empty directories
- [x] Verified environment configuration

---

## 📋 DEPLOYMENT STEPS

### Step 1: Push to GitHub

```bash
cd "/Users/suraj/Desktop/Fundamental Anslysis"

# Initialize git (if not done)
git init

# Add all files
git add .

# Commit
git commit -m "Ready for deployment - Stock screener with 86 stocks"

# Create GitHub repo at github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

---

### Step 2: Deploy Backend to Render

1. Go to [render.com](https://render.com)
2. Sign in / Sign up (free)
3. Click **"New +"** → **"Web Service"**
4. **Connect GitHub Repository**
5. Configure:
   ```
   Name: fundakamental-backend
   Region: (closest to you)
   Branch: main
   Root Directory: backend
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: sh start.sh
   Instance Type: Free
   ```

6. **Environment Variables** (Click "Add Environment Variable"):
   ```
   SUPABASE_URL=https://dpmicndslhinabslkdxy.supabase.co
   SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwbWljbmRzbGhpbmFic2xrZHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MjA3NTIsImV4cCI6MjA4ODM5Njc1Mn0.uxoa2OIM4ga4G-oIGldFuFTm3QCm55ReM2yH6xCHRX0
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwbWljbmRzbGhpbmFic2xrZHh5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgyMDc1MiwiZXhwIjoyMDg4Mzk2NzUyfQ.FeKbEnQOp9lVU-VRFfKJLqLuOI2dF1K2rsF-ElJjhoM
   SECRET_KEY=09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7
   OPENAI_API_KEY=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
   CORS_ORIGINS=http://localhost:5173
   ENVIRONMENT=production
   DEBUG=False
   API_PORT=8080
   ```

7. Click **"Create Web Service"**
8. Wait for deployment (~10 minutes)
9. **Copy your backend URL** (e.g., `https://fundakamental-backend.onrender.com`)

---

### Step 3: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click **"Add New Project"**
4. **Import your GitHub repository**
5. Configure:
   ```
   Framework Preset: Vite
   Root Directory: ./
   Build Command: npm run build
   Output Directory: dist
   ```

6. **Environment Variables**:
   ```
   VITE_API_URL=https://YOUR-BACKEND.onrender.com
   VITE_SUPABASE_URL=https://dpmicndslhinabslkdxy.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwbWljbmRzbGhpbmFic2xrZHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MjA3NTIsImV4cCI6MjA4ODM5Njc1Mn0.uxoa2OIM4ga4G-oIGldFuFTm3QCm55ReM2yH6xCHRX0
   ```
   
   **Replace `YOUR-BACKEND` with your actual Render URL!**

7. Click **"Deploy"**
8. Wait for deployment (~5 minutes)
9. **Copy your frontend URL** (e.g., `https://fundakamental.vercel.app`)

---

### Step 4: Update CORS Settings

1. Go back to **Render Dashboard**
2. Select your backend service
3. Go to **Environment** tab
4. Update `CORS_ORIGINS` to include your Vercel URL:
   ```
   CORS_ORIGINS=https://YOUR-APP.vercel.app,https://YOUR-APP-*.vercel.app,http://localhost:5173
   ```
5. Click **"Save Changes"**
6. Service will auto-redeploy

---

## ✅ Post-Deployment Verification

### Test Backend:
```bash
# Health check
curl https://YOUR-BACKEND.onrender.com/

# Should return:
# {"message":"Welcome to FundaKaMental API",...}

# Test stock screener
curl -X POST https://YOUR-BACKEND.onrender.com/api/stocks/screener \
  -H "Content-Type: application/json" \
  -d '{"filters":[],"sort_by":"market_cap","sort_order":"desc","limit":5}'
```

### Test Frontend:
1. Open `https://YOUR-APP.vercel.app`
2. Try login: `surajnandan78@gmail.com` / `123456789`
3. Navigate to Stock Scanner
4. Test filters
5. Check browser console (F12) for errors

---

## 🎯 Success Criteria

- [ ] Backend deployed on Render
- [ ] Frontend deployed on Vercel
- [ ] Backend health check returns 200
- [ ] Frontend loads successfully
- [ ] Login works
- [ ] Stock screener loads 86 stocks
- [ ] Filters work correctly
- [ ] No CORS errors
- [ ] No authentication errors

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| **CORS Error** | Update backend `CORS_ORIGINS` with Vercel URL |
| **API Connection Failed** | Check `VITE_API_URL` in Vercel env vars |
| **Backend won't start** | Check Render logs for errors |
| **Build failed** | Verify `requirements.txt` has all deps |
| **Database error** | Verify Supabase credentials |
| **Backend slow/timeout** | Free tier spins down after 15 min (normal) |

---

## 💰 Cost

**Total: FREE** (with limitations)

- **Vercel**: Free tier (100 GB bandwidth, generous limits)
- **Render**: Free tier (sleeps after 15 min, 750 hours/month)
- **Supabase**: Free tier (500 MB database, 2 GB storage)

**Upgrade if needed:**
- Render Starter: $7/month (always-on, no sleep)
- Vercel Pro: $20/month (more bandwidth)
- Supabase Pro: $25/month (8 GB database)

---

## 📱 Your Live URLs

After deployment:

- **Frontend**: `https://YOUR-APP.vercel.app`
- **Backend**: `https://YOUR-BACKEND.onrender.com`
- **API Docs**: `https://YOUR-BACKEND.onrender.com/api/docs`
- **Database**: Already live on Supabase

---

## 🔄 Continuous Deployment

Both platforms auto-deploy when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "Update feature X"
git push

# Vercel & Render will auto-deploy! 🚀
```

---

## 📞 Support

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs

---

## 🎉 You're Ready!

Follow the steps above and your app will be live in ~30 minutes!

**Need help?** Check `DEPLOYMENT_GUIDE.md` for detailed instructions.
