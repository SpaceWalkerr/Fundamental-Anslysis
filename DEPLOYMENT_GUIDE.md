# Deployment Guide

This app uses:

- Frontend: Vite/React on Vercel
- Backend: FastAPI on Render
- Database/Auth/Storage: Supabase

## 1. Create a New Supabase Project

1. In Supabase, create a new project.
2. Save these values from Project Settings > API:
   - Project URL
   - anon/public or publishable key
   - service_role/secret key
3. Keep the service_role/secret key backend-only. Never put it in Vercel or frontend code.

If any real keys were previously pasted into committed docs, rotate them before deploying the new project.

## 2. Apply Database Schema

Fastest fresh-project path:

1. Open Supabase SQL Editor.
2. Run every file in `backend/migrations` in numeric order:
   - `001_init_schema.sql`
   - `002_update_reports_schema.sql`
   - `003_create_stocks_tables.sql`
   - `004_add_realtime_features.sql`
   - `005_add_technical_indicators.sql`
   - `006_add_payment_system.sql`
   - `007_add_portfolio_tracking.sql`
   - `008_add_watchlist_manager.sql`
   - `009_fix_backend_schema_alignment.sql`
3. Confirm the `documents` storage bucket exists.
4. Confirm these tables exist: `users`, `reports`, `source_documents`, `stocks`, `price_alerts`, `subscription_plans`, `portfolios`, `watchlists`, `watchlist_items`.

Preferred long-term path:

1. Install Supabase CLI.
2. Put these SQL files under `supabase/migrations`.
3. Run `supabase login`.
4. Run `supabase link --project-ref YOUR_PROJECT_REF`.
5. Run `supabase db push --dry-run`.
6. Run `supabase db push`.

## 3. Configure Supabase Auth

For easiest first deployment:

1. Go to Authentication > Providers.
2. Enable Email provider.
3. Decide whether email confirmation is required.
4. Add your frontend production URL to Auth > URL Configuration:
   - Site URL: `https://YOUR-APP.vercel.app`
   - Redirect URLs: `https://YOUR-APP.vercel.app/*`

## 4. Deploy Backend to Render

Using the included `render.yaml` blueprint:

1. Push the repo to GitHub.
2. In Render, create a Blueprint from the repo.
3. Add these environment variables:

```bash
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
SUPABASE_SERVICE_KEY=YOUR_SUPABASE_SERVICE_ROLE_OR_SECRET_KEY
SECRET_KEY=GENERATE_WITH_OPENSSL_RAND_HEX_32
ENVIRONMENT=production
DEBUG=False
CORS_ORIGINS=https://YOUR-APP.vercel.app,http://localhost:5173
FRONTEND_URL=https://YOUR-APP.vercel.app
OPENAI_API_KEY=YOUR_OPENAI_KEY
```

Generate `SECRET_KEY` locally:

```bash
openssl rand -hex 32
```

If using Render Dashboard manually:

```bash
Root Directory: leave blank if using render.yaml, or backend if configuring manually
Build Command: cd backend && pip install --upgrade pip && pip install -r requirements.txt
Start Command: cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
Health Check Path: /health
```

## 5. Seed Stocks

After the backend env vars are configured locally or in a shell with access to the new Supabase keys:

```bash
cd backend
python populate_stocks.py
```

This populates `stocks` using Yahoo Finance data. It is optional, but the stock scanner is much better after seeding.

## 6. Deploy Frontend to Vercel

Add these Vercel environment variables:

```bash
VITE_API_URL=https://YOUR-BACKEND.onrender.com
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
VITE_ENABLE_TEST_LOGIN=false
```

Build settings:

```bash
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

## 7. Verify

Backend:

```bash
curl https://YOUR-BACKEND.onrender.com/health
curl https://YOUR-BACKEND.onrender.com/api/docs
```

Frontend:

1. Open the Vercel URL.
2. Register a new account.
3. Upload a small PDF/XLSX/CSV document.
4. Run analysis.
5. Open Stock Scanner.

## Common Problems

- Backend fails on startup: check `SUPABASE_SERVICE_KEY`, `SECRET_KEY`, and `yfinance` installation in Render logs.
- CORS error: add the exact Vercel URL to backend `CORS_ORIGINS` and redeploy Render.
- Registration works but profile is missing: confirm migration `001_init_schema.sql` created `handle_new_user`.
- Upload fails: confirm the `documents` bucket and storage policies were created by migration 001.
- Analysis fails: set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`.
