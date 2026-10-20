create extension if not exists pgcrypto;

create table if not exists public.membership_cards (
  id uuid primary key default gen_random_uuid(),
  public_membership_id text not null unique,
  organization_name text not null,
  member_name text not null,
  membership_type text not null,
  expiration_date date,
  photo_data_url text,
  design jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shipping_config (
  id integer primary key default 1,
  base_fee_cents integer not null default 499,
  card_fee_cents integer not null default 0,
  international_surcharge_cents integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.shipment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  card_id text not null,
  card_snapshot jsonb not null,
  recipient_name text not null,
  email text not null,
  phone text,
  street text not null,
  unit text,
  city text not null,
  state text,
  postal_code text not null,
  country text not null default 'US',
  shipping_cost_cents integer not null,
  delivery_method text not null default 'standard',
  delivery_fee_cents integer not null default 1000,
  delivery_window text not null default '2–3 weeks',
  total_cents integer not null,
  idempotency_key text not null unique,
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed')),
  solana_reference text unique,
  solana_amount_lamports bigint,
  solana_usd_rate numeric(12,4),
  payment_provider text,
  solana_signature text unique,
  payment_reference text unique,
  tx_signature text unique,
  amount numeric(30,9),
  token text,
  usdc_amount integer,
  stripe_session_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shipment_orders_user_idx on public.shipment_orders (user_id, created_at desc);
create index if not exists shipment_orders_status_idx on public.shipment_orders (payment_status, created_at desc);

create table if not exists public.wallet_deposits (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  order_id uuid references public.shipment_orders(id) on delete set null,
  asset text not null check (asset in ('SOL', 'USDC')),
  amount_atomic numeric(30,0) not null,
  amount_usd_cents integer not null default 0,
  signature text not null unique,
  status text not null default 'pending' check (status in ('pending','confirmed','rejected')),
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists wallet_deposits_user_idx on public.wallet_deposits (user_id, status, created_at desc);

create table if not exists public.card_designs (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references public.membership_cards(id) on delete cascade,
  owner_id text not null,
  name text not null default 'Untitled design',
  canvas_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists card_designs_owner_idx on public.card_designs (owner_id, updated_at desc);

alter table public.shipment_orders add column if not exists payment_reference text;
alter table public.shipment_orders add column if not exists tx_signature text;
alter table public.shipment_orders add column if not exists amount numeric(30,9);
alter table public.shipment_orders add column if not exists token text;
alter table public.shipment_orders add column if not exists usdc_amount integer;
create unique index if not exists shipment_orders_payment_reference_idx on public.shipment_orders (payment_reference) where payment_reference is not null;
create unique index if not exists shipment_orders_tx_signature_idx on public.shipment_orders (tx_signature) where tx_signature is not null;
alter table public.shipment_orders add column if not exists delivery_method text not null default 'standard';
alter table public.shipment_orders add column if not exists delivery_fee_cents integer not null default 1000;
alter table public.shipment_orders add column if not exists delivery_window text not null default '2–3 weeks';
create unique index if not exists shipment_orders_payment_signature_idx on public.shipment_orders (solana_signature) where solana_signature is not null;
