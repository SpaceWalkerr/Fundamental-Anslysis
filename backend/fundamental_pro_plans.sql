-- ═══════════════════════════════════════════════════════════════════════
-- FUNDAKAMENTAL PRO — server-authoritative plan storage
--
-- Run once in the Supabase SQL editor (Dashboard → SQL → New query).
--
-- Security model:
--   • The `profiles.plan` column is the source of truth the app already reads.
--   • Only the backend (service-role key, after Razorpay signature check)
--     upgrades a user to 'premium' and stamps plan_valid_until.
--   • A separate audit table records every verified payment.
--   • RLS lets a user read only their own payment rows; there are no client
--     write policies, so a forged client can never grant itself Pro.
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Ensure the profiles table can hold plan expiry (idempotent).
alter table public.profiles
  add column if not exists plan_valid_until timestamptz;

-- 2. Payment audit / entitlement records.
create table if not exists public.pro_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id text not null,
  billing text,
  currency text not null default 'INR',
  amount numeric not null default 0,
  payment_id text,
  order_id text,
  activated_at timestamptz not null default now(),
  valid_until timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists pro_payments_user_id_idx on public.pro_payments (user_id);

alter table public.pro_payments enable row level security;

-- Users may read their own payment history. Writes are service-role only
-- (service role bypasses RLS), so no insert/update/delete policies exist.
drop policy if exists "Users can view own pro payments" on public.pro_payments;
create policy "Users can view own pro payments"
  on public.pro_payments
  for select
  using (auth.uid() = user_id);
