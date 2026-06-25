# Deployment Checklist

## Supabase

- [ ] New Supabase project created
- [ ] Project URL copied
- [ ] anon/public or publishable key copied
- [ ] service_role/secret key copied and kept backend-only
- [ ] Migrations `001` through `009` applied in order
- [ ] `documents` storage bucket exists
- [ ] Email Auth provider enabled
- [ ] Production frontend URL added to Auth URL Configuration

## Backend

- [ ] Render service created
- [ ] `SUPABASE_URL` set
- [ ] `SUPABASE_KEY` set
- [ ] `SUPABASE_SERVICE_KEY` set
- [ ] `SECRET_KEY` generated with `openssl rand -hex 32`
- [ ] `ENVIRONMENT=production`
- [ ] `DEBUG=False`
- [ ] `CORS_ORIGINS` includes production frontend URL
- [ ] `/health` returns 200
- [ ] `/api/docs` loads

## Frontend

- [ ] Vercel project created
- [ ] `VITE_API_URL` points to Render backend
- [ ] `VITE_SUPABASE_URL` points to the new Supabase project
- [ ] `VITE_SUPABASE_ANON_KEY` uses the anon/public or publishable key
- [ ] Site builds successfully
- [ ] Register/login works

## Optional Data

- [ ] `python backend/populate_stocks.py` run successfully
- [ ] Stock scanner returns real rows

## Security

- [ ] No real keys in committed Markdown/docs
- [ ] Old exposed Supabase/OpenAI/Stripe keys rotated
- [ ] `SUPABASE_SERVICE_KEY` is not present in Vercel
- [ ] `ENABLE_TEST_LOGIN=False`
- [ ] `VITE_ENABLE_TEST_LOGIN=false`
