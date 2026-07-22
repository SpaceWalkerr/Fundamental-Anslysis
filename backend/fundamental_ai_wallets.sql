-- ═══════════════════════════════════════════════════════════════════════
-- FUNDAKAMENTAL AI TOKEN WALLETS
--
-- Run once in the Supabase SQL editor.
--
-- Meters AI usage so the product stays profitable:
--   • monthly_balance resets each month by plan tier (backend-managed)
--   • topup_balance holds purchased packs and never expires
-- Only the backend (service-role) writes these values after real usage or a
-- verified payment. Users may READ their own wallet (RLS); no client writes.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.ai_wallets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tier text not null default 'free',
  period text not null,                     -- 'YYYY-MM' the monthly grant applies to
  monthly_balance bigint not null default 0,
  monthly_grant bigint not null default 0,
  topup_balance bigint not null default 0,  -- purchased tokens, never expire
  tokens_used_total bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.ai_wallets enable row level security;

drop policy if exists "Users can view own wallet" on public.ai_wallets;
create policy "Users can view own wallet"
  on public.ai_wallets
  for select
  using (auth.uid() = user_id);

-- Optional: audit of token-pack purchases.
create table if not exists public.token_pack_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pack_id text not null,
  tokens bigint not null,
  currency text not null default 'INR',
  amount numeric not null default 0,
  payment_id text,
  order_id text,
  created_at timestamptz not null default now()
);

create index if not exists token_pack_purchases_user_idx on public.token_pack_purchases (user_id);
alter table public.token_pack_purchases enable row level security;

drop policy if exists "Users can view own token purchases" on public.token_pack_purchases;
create policy "Users can view own token purchases"
  on public.token_pack_purchases
  for select
  using (auth.uid() = user_id);
