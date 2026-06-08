# Supabase Setup

Use this when you have created a new Supabase project and need to wire the backend back up after deleting the old one.

## 1. Create a New Supabase Project

1. In Supabase, create a new project.
2. Copy these values from Project Settings > API:
   - Project URL
   - anon/public or publishable key
   - service_role/secret key
3. Keep the service_role/secret key backend-only.

If the old project or any of its keys were exposed in docs, rotate them before deploying the new one.

## 2. Apply the Database Schema

The backend expects a fresh project to contain the schema from the migration files in `backend/migrations`.

Run them in numeric order:

1. `001_init_schema.sql`
2. `002_update_reports_schema.sql`
3. `003_create_stocks_tables.sql`
4. `004_add_realtime_features.sql`
5. `005_add_technical_indicators.sql`
6. `006_add_payment_system.sql`
7. `007_add_portfolio_tracking.sql`
8. `008_add_watchlist_manager.sql`
9. `009_fix_backend_schema_alignment.sql`

After the migrations run, verify these objects exist:

- `public.users`
- `public.reports`
- `public.source_documents`
- `public.stocks`
- `public.saved_screens`
- `public.watchlists`
- `public.watchlist_items`
- `public.watchlist_snapshots`
- `public.subscriptions`
- `public.payment_history`
- `public.feature_usage`
- `public.stripe_webhook_events`
- Storage bucket `documents`

## 3. Configure Auth

1. Go to Authentication > Providers.
2. Enable Email provider.
3. Decide whether email confirmation is required.
4. Add your app URLs in Authentication > URL Configuration.
   - Site URL: `https://YOUR-APP.vercel.app`
   - Redirect URLs: `https://YOUR-APP.vercel.app/*`

## 4. Set Backend Environment Variables

The FastAPI backend reads these values:

```bash
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
SUPABASE_SERVICE_KEY=YOUR_SUPABASE_SERVICE_ROLE_OR_SECRET_KEY
SECRET_KEY=GENERATE_A_NEW_RANDOM_SECRET
ENVIRONMENT=production
DEBUG=False
FRONTEND_URL=https://YOUR-APP.vercel.app
```

For Render, add the same values in the service environment settings or in `render.yaml`.

## 5. Set Frontend Environment Variables

The Vite frontend uses separate public env vars:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
VITE_API_URL=https://YOUR-BACKEND.onrender.com
```

## 6. Verify the Backend

After deployment, check:

```bash
curl https://YOUR-BACKEND.onrender.com/health
curl https://YOUR-BACKEND.onrender.com/api/docs
```

If startup logs show `Failed to connect to Supabase`, the most common causes are:

- the old project URL is still in `SUPABASE_URL`
- the anon key or service key does not belong to the new project
- the schema migrations were not applied yet
- the `documents` storage bucket is missing