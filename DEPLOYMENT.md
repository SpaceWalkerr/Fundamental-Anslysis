# 🚀 Deployment Guide

Complete guide to deploy your Fundamental Analysis application to production.

## 📋 Prerequisites

Before deploying, ensure you have:
- ✅ GitHub account
- ✅ Vercel account (for frontend)
- ✅ Render account (for backend)
- ✅ Supabase project (database)
- ✅ OpenAI/Anthropic API key (for AI features)
- ✅ Stock market data API key (Alpha Vantage, FMP, or Polygon)
- ✅ Stripe account (optional, for payments)

---

## 🗄️ Part 1: Database Setup (Supabase)

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Wait for project initialization
4. Copy your project credentials:
   - Project URL: `https://[your-project].supabase.co`
   - Anon/Public Key: `eyJh...` (from Settings > API)
   - Service Role Key: `eyJh...` (from Settings > API)

### 2. Run Database Migrations
1. Open SQL Editor in Supabase Dashboard
2. Open `COMPLETE_SETUP.sql` from the repository
3. Copy entire contents and paste into SQL Editor
4. Click "Run" to execute
5. Verify tables created: Go to Table Editor and check for:
   - users, reports, source_documents, chat_messages
   - portfolios, watchlists, stocks, alerts
   - subscription_plans, payment_transactions

### 3. Configure Authentication
1. Go to Authentication > Settings
2. **Disable email confirmation** (or configure SMTP):
   - Settings > Auth > Email Auth
   - Toggle off "Enable email confirmations"
3. Configure site URL:
   - Set to your Vercel domain: `https://your-app.vercel.app`
4. Add redirect URLs:
   - `https://your-app.vercel.app/*`
   - `http://localhost:5173/*` (for local dev)

### 4. Configure Row Level Security (RLS)
RLS policies are included in `COMPLETE_SETUP.sql`. Verify they're active:
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

All tables should have `rowsecurity = true`.

---

## 🎨 Part 2: Frontend Deployment (Vercel)

### 1. Push Code to GitHub
```bash
# Initialize git (if not already done)
cd "/Users/suraj/Desktop/Fundamental Anslysis"
git init
git add .
git commit -m "Initial commit - ready for deployment"

# Create GitHub repository and push
git remote add origin https://github.com/yourusername/your-repo.git
git branch -M main
git push -u origin main
```

### 2. Deploy to Vercel

#### Option A: Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset:** Vite
   - **Root Directory:** `./` (leave as root)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

#### Option B: Vercel CLI
```bash
npm i -g vercel
vercel login
vercel --prod
```

### 3. Configure Environment Variables in Vercel
Go to Project Settings > Environment Variables and add:

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_API_URL` | `https://your-api.onrender.com` | Backend API URL |
| `VITE_SUPABASE_URL` | `https://[project].supabase.co` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJh...` | Supabase anon/public key |

**Important:** After adding variables, redeploy:
```bash
vercel --prod
```

### 4. Verify Frontend Deployment
1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Check that landing page loads
3. Try to register a new user
4. If API calls fail, verify `VITE_API_URL` is correct

---

## ⚙️ Part 3: Backend Deployment (Render)

### 1. Prepare Backend for Deployment

#### Create Procfile (optional, for explicit process definition)
Create `backend/Procfile`:
```
web: python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

#### Verify requirements.txt
Ensure `backend/requirements.txt` includes all dependencies:
```bash
cd backend
pip freeze > requirements.txt
```

### 2. Deploy to Render

#### Option A: Render Dashboard
1. Go to [render.com](https://render.com)
2. Click "New +" > "Web Service"
3. Connect your GitHub repository
4. Configure service:
   - **Name:** `fundamental-analysis-api`
   - **Region:** Choose closest to your users
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free (or paid for better performance)

#### Option B: Using render.yaml (Infrastructure as Code)
The `render.yaml` file is already configured. Render will auto-detect it:
1. Connect repository to Render
2. Render reads `render.yaml` automatically
3. Approve and deploy

### 3. Configure Environment Variables in Render
Go to Environment tab and add:

#### Required Variables:
```bash
# Database
SUPABASE_URL=https://[project].supabase.co
SUPABASE_KEY=[anon-key]
SUPABASE_SERVICE_KEY=[service-role-key]

# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Stock Data (choose one or more)
ALPHA_VANTAGE_API_KEY=your-key
FMP_API_KEY=your-key
POLYGON_API_KEY=your-key

# URLs
FRONTEND_URL=https://your-app.vercel.app
BACKEND_URL=https://your-api.onrender.com

# Security
JWT_SECRET=[auto-generated by Render]
```

#### Optional (for payments):
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_ANNUAL=price_...
```

### 4. Verify Backend Deployment
```bash
# Check health endpoint
curl https://your-api.onrender.com/health

# Expected response:
# {"status": "healthy", "database": "connected"}
```

---

## 🔗 Part 4: Connect Frontend to Backend

### 1. Update Frontend Environment Variable
1. Go to Vercel > Your Project > Settings > Environment Variables
2. Update `VITE_API_URL` to your Render URL:
   ```
   VITE_API_URL=https://your-api.onrender.com
   ```
3. Redeploy frontend:
   ```bash
   vercel --prod
   ```

### 2. Update Backend CORS Settings
Ensure `backend/app/main.py` allows your Vercel domain:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://your-app.vercel.app",  # Add your domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Commit and push changes to trigger Render redeploy.

---

## 🧪 Part 5: Test Production Deployment

### 1. Test Authentication Flow
1. Visit your Vercel URL
2. Click "Get Started" or "Sign Up"
3. Register new account with valid email
4. Login with credentials
5. Verify you reach the dashboard

### 2. Test Core Features
- ✅ Upload a PDF financial document
- ✅ Wait for AI analysis
- ✅ View generated report
- ✅ Chat with document (Q&A)
- ✅ Create portfolio
- ✅ Add stocks to watchlist
- ✅ Set price alerts

### 3. Monitor Logs
- **Frontend:** Vercel Dashboard > Deployments > [Latest] > Function Logs
- **Backend:** Render Dashboard > [Your Service] > Logs

### 4. Check for Errors
Common deployment issues:
- ❌ CORS errors → Update `allow_origins` in backend
- ❌ Environment variable errors → Check all vars are set
- ❌ Database connection errors → Verify Supabase credentials
- ❌ API key errors → Verify OpenAI/Anthropic/Stock API keys

---

## 📊 Part 6: Optional Configurations

### Enable Custom Domain (Vercel)
1. Go to Project Settings > Domains
2. Add your custom domain (e.g., `app.yourdomain.com`)
3. Configure DNS records as shown
4. Wait for SSL certificate provisioning

### Enable Custom Domain (Render)
1. Upgrade to paid plan (required for custom domains)
2. Go to Settings > Custom Domain
3. Add domain and configure DNS
4. Wait for SSL certificate

### Set Up Monitoring
**Vercel Analytics:**
```bash
npm install @vercel/analytics
```

Add to `src/main.tsx`:
```tsx
import { Analytics } from '@vercel/analytics/react';

// In your app root:
<Analytics />
```

**Sentry (Error Tracking):**
1. Create account at [sentry.io](https://sentry.io)
2. Install SDK:
```bash
npm install @sentry/react
```
3. Configure in `src/main.tsx`

### Configure Email Notifications
If you want email confirmations and password resets:
1. Supabase Dashboard > Authentication > Email Templates
2. Configure SMTP settings or use Supabase's default
3. Customize email templates

### Set Up Stripe Payments (Optional)
1. Go to [stripe.com](https://stripe.com)
2. Get API keys (test and live)
3. Create products and prices
4. Add keys to Render environment variables
5. Configure webhook endpoint: `https://your-api.onrender.com/api/webhooks/stripe`
6. Add webhook secret to environment variables

---

## 📦 Environment Variables Reference

### Frontend (.env - Vercel)
```bash
VITE_API_URL=https://your-api.onrender.com
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=eyJh...
```

### Backend (.env - Render)
```bash
# Database
SUPABASE_URL=https://[project].supabase.co
SUPABASE_KEY=eyJh...
SUPABASE_SERVICE_KEY=eyJh...

# AI
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Stock Data
ALPHA_VANTAGE_API_KEY=your-key
FMP_API_KEY=your-key
POLYGON_API_KEY=your-key

# URLs
FRONTEND_URL=https://your-app.vercel.app
BACKEND_URL=https://your-api.onrender.com

# Security
JWT_SECRET=your-secret-key

# Payments (optional)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_ANNUAL=price_...
```

---

## 🔄 Continuous Deployment

Both Vercel and Render support automatic deployments:

### Auto-Deploy Setup
1. Every push to `main` branch triggers deployment
2. Pull requests create preview deployments
3. Monitor deployment status in respective dashboards

### Git Workflow
```bash
# Make changes
git add .
git commit -m "Your change description"
git push origin main

# Vercel and Render auto-deploy
```

---

## 🐛 Troubleshooting

### Issue: "Database connection failed"
**Solution:**
- Verify Supabase credentials in environment variables
- Check Supabase project is active (not paused)
- Ensure database migrations ran successfully

### Issue: "CORS error" when calling API
**Solution:**
- Add Vercel domain to `allow_origins` in `backend/app/main.py`
- Redeploy backend
- Clear browser cache

### Issue: "Authentication failed" or "Invalid token"
**Solution:**
- Verify `SUPABASE_URL` and `SUPABASE_KEY` match between frontend and backend
- Check Supabase Authentication settings
- Ensure JWT_SECRET is set in backend

### Issue: "OpenAI API error" or "Rate limit exceeded"
**Solution:**
- Verify OpenAI API key is valid
- Check API quota/billing in OpenAI dashboard
- Consider adding Anthropic as fallback

### Issue: Render service keeps crashing
**Solution:**
- Check logs in Render dashboard
- Verify all required environment variables are set
- Ensure Python version compatibility (3.11+)
- Check if port binding is correct (`$PORT` variable)

### Issue: Frontend builds but shows blank page
**Solution:**
- Check browser console for errors
- Verify `VITE_API_URL` is set correctly
- Ensure API is accessible from browser
- Check network tab for failed requests

---

## ✅ Deployment Checklist

Before going live:

- [ ] Database migrations run successfully in Supabase
- [ ] All environment variables configured in Vercel
- [ ] All environment variables configured in Render
- [ ] Frontend builds and deploys without errors
- [ ] Backend health check endpoint responds
- [ ] User registration works
- [ ] User login works
- [ ] Document upload works
- [ ] AI analysis generates reports
- [ ] Chat feature works
- [ ] Portfolio management works
- [ ] Watchlist management works
- [ ] Price alerts work
- [ ] CORS configured correctly
- [ ] SSL certificates active (https)
- [ ] Error monitoring set up (optional)
- [ ] Custom domain configured (optional)
- [ ] Payment system tested (optional)

---

## 🎉 You're Live!

Once all checks pass, your application is ready for users!

**Share your app:**
- Frontend: `https://your-app.vercel.app`
- API Docs: `https://your-api.onrender.com/docs`

**Monitor performance:**
- Vercel Analytics Dashboard
- Render Metrics Dashboard
- Supabase Database Dashboard

**Next steps:**
- Set up monitoring and alerts
- Configure backups (Supabase automatic)
- Plan scaling strategy
- Gather user feedback
- Iterate and improve!

---

## 📞 Support Resources

- **Vercel:** [vercel.com/docs](https://vercel.com/docs)
- **Render:** [render.com/docs](https://render.com/docs)
- **Supabase:** [supabase.com/docs](https://supabase.com/docs)
- **FastAPI:** [fastapi.tiangolo.com](https://fastapi.tiangolo.com)
- **React:** [react.dev](https://react.dev)

---

**Last Updated:** March 7, 2026  
**Deployment Stack:** Vercel (Frontend) + Render (Backend) + Supabase (Database)
