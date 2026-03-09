# Quick Start - Deployment

## ✅ Cleaned Up Files
Your project is now ready for deployment. All unnecessary test and cache files have been removed.

---

## 🚀 QUICK DEPLOYMENT STEPS

### 1️⃣ Initialize Git (if not already done)

```bash
cd "/Users/suraj/Desktop/Fundamental Anslysis"
git init
git add .
git commit -m "Initial commit - Ready for deployment"
```

### 2️⃣ Push to GitHub

```bash
# Create a new repository on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

---

## 🎨 Deploy Frontend to Vercel

### Using Vercel Dashboard (Easiest):

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework**: Vite
   - **Root Directory**: `./` (keep default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. **Add Environment Variables:**
   ```
   VITE_API_URL=https://your-backend-url.onrender.com
   VITE_SUPABASE_URL=https://dpmicndslhinabslkdxy.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwbWljbmRzbGhpbmFic2xrZHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MjA3NTIsImV4cCI6MjA4ODM5Njc1Mn0.uxoa2OIM4ga4G-oIGldFuFTm3QCm55ReM2yH6xCHRX0
   ```
6. Click **"Deploy"**

**Note:** You'll update `VITE_API_URL` after deploying the backend.

---

## ⚙️ Deploy Backend to Render

### Using Render Dashboard:

1. Go to [render.com](https://render.com) and sign in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   ```
   Name: fundavision-backend
   Region: (Choose closest)
   Branch: main
   Root Directory: backend
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: sh start.sh
   ```

5. **Add Environment Variables** (IMPORTANT):
   ```
   SUPABASE_URL=https://dpmicndslhinabslkdxy.supabase.co
   SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwbWljbmRzbGhpbmFic2xrZHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MjA3NTIsImV4cCI6MjA4ODM5Njc1Mn0.uxoa2OIM4ga4G-oIGldFuFTm3QCm55ReM2yH6xCHRX0
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwbWljbmRzbGhpbmFic2xrZHh5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgyMDc1MiwiZXhwIjoyMDg4Mzk2NzUyfQ.FeKbEnQOp9lVU-VRFfKJLqLuOI2dF1K2rsF-ElJjhoM
   SECRET_KEY=09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7
   OPENAI_API_KEY=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
   CORS_ORIGINS=https://your-app.vercel.app,http://localhost:5173
   ENVIRONMENT=production
   DEBUG=False
   API_PORT=8080
   ```

6. Click **"Create Web Service"**
7. Wait 5-10 minutes for deployment
8. Copy your backend URL (e.g., `https://fundavision-backend.onrender.com`)

---

## 🔄 Update Frontend with Backend URL

After backend is deployed:

1. Go to Vercel Dashboard → Your Project
2. Settings → Environment Variables
3. Update `VITE_API_URL` to your Render backend URL:
   ```
   VITE_API_URL=https://YOUR-BACKEND.onrender.com
   ```
4. Go to **Deployments** → Click "..." on latest → **Redeploy**

Also update your backend CORS:
1. Go to Render Dashboard → Your Service
2. Environment → Edit `CORS_ORIGINS`
3. Add your Vercel URL:
   ```
   CORS_ORIGINS=https://your-app.vercel.app,https://your-app-*.vercel.app
   ```

---

## ✅ Verify Deployment

**Frontend:**
- Visit: `https://your-app.vercel.app`
- Test login with: `surajnandan78@gmail.com` / `123456789`
- Try Stock Scanner

**Backend:**
- Check health: `https://your-backend.onrender.com/`
- View API docs: `https://your-backend.onrender.com/api/docs`

---

## 🐛 Common Issues

### Frontend shows "API Error"
- Check backend is deployed and running
- Verify `VITE_API_URL` in Vercel environment variables
- Check CORS settings in backend

### Backend deployment fails
- Check Render logs for errors
- Verify all environment variables are set
- Check `requirements.txt` has all dependencies

### Database connection error
- Verify Supabase keys are correct
- Check Supabase project isn't paused

---

## 📱 Your Deployed URLs

After deployment, you'll have:
- **Frontend**: `https://YOUR-APP.vercel.app`
- **Backend**: `https://YOUR-BACKEND.onrender.com`  
- **Database**: `https://dpmicndslhinabslkdxy.supabase.co` (already live)

---

## 💡 Tips

1. **Free Tier Limits:**
   - Render free tier spins down after 15 min inactivity (30s to wake up)
   - Vercel has generous free tier limits
   - Upgrade if you need always-on backend

2. **Monitoring:**
   - Check Vercel Analytics for frontend usage
   - Check Render Logs for backend errors
   - Supabase Dashboard shows database metrics

3. **Updates:**
   - Push to GitHub → Auto-deploys to both Vercel and Render
   - Set up automatic deployments for CI/CD

---

For detailed instructions, see **DEPLOYMENT_GUIDE.md**

Happy deploying! 🎉
