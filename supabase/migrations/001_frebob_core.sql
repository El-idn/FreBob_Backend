-- FreBob MVP schema draft (PRD §17)
-- Apply in Supabase SQL editor or via CLI migrations.
-- Every business-owned table includes business_id for RLS isolation.

create extension if not exists "pgcrypto";
create extension if not exists "vector";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  preferred_language text not null default 'en'
    check (preferred_language in ('en', 'pcm', 'yo', 'ha', 'ig')),
  created_at timestamptz not null default now()
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  location text,
  currency text not null default 'NGN',
  preferred_language text not null default 'en'
    check (preferred_language in ('en', 'pcm', 'yo', 'ha', 'ig')),
  owner_user_id uuid references public.users (id),
  created_at timestamptz not null default now()
);

create table if not exists public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role text not null default 'owner'
    check (role in ('owner', 'manager', 'sales_attendant', 'inventory_staff', 'read_only')),
  unique (business_id, user_id)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  phone text,
  balance_owed numeric(14, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  variant text,
  unit_price numeric(14, 2) not null,
  available integer not null default 0,
  reserved integer not null default 0,
  low_stock_threshold integer not null default 3,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid references public.customers (id),
  customer_name text not null,
  total numeric(14, 2) not null,
  amount_paid numeric(14, 2) not null default 0,
  balance numeric(14, 2) not null default 0,
  payment_status text not null
    check (payment_status in ('unpaid', 'partially_paid', 'paid')),
  order_status text not null
    check (order_status in ('enquiry', 'reserved', 'confirmed', 'cancelled', 'fulfilled')),
  source text not null
    check (source in ('whatsapp', 'sms', 'scanner', 'manual')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id),
  product_name text not null,
  variant text,
  quantity integer not null,
  unit_price numeric(14, 2) not null,
  line_total numeric(14, 2) not null
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  amount numeric(14, 2) not null,
  method text not null check (method in ('cash', 'transfer', 'pos', 'other')),
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  product_id uuid references public.products (id),
  product_name text not null,
  event_type text not null check (event_type in ('reserve', 'release', 'sale', 'restock')),
  quantity integer not null,
  order_id uuid references public.orders (id),
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  source_label text,
  source_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sms_messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  storage_path text,
  mime_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_extractions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  source text not null check (source in ('whatsapp', 'sms', 'scanner', 'manual')),
  source_ref_id uuid,
  raw_json jsonb not null,
  corrected_json jsonb,
  status text not null default 'unconfirmed'
    check (status in ('unconfirmed', 'confirmed', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.business_memories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind text not null,
  content text not null,
  trust_level text not null default 'confirmed'
    check (trust_level in ('confirmed', 'unconfirmed', 'reference', 'rejected')),
  order_id uuid references public.orders (id),
  created_at timestamptz not null default now()
);

create table if not exists public.memory_embeddings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  memory_id uuid references public.business_memories (id) on delete cascade,
  embedding vector(768),
  created_at timestamptz not null default now()
);

create table if not exists public.chatbot_sessions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid references public.users (id),
  created_at timestamptz not null default now()
);

create table if not exists public.chatbot_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chatbot_sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  evidence text,
  language text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses (id) on delete cascade,
  actor_user_id uuid references public.users (id),
  action text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

-- Helper: businesses the current auth user belongs to
create or replace function public.user_business_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select bm.business_id
  from public.business_members bm
  join public.users u on u.id = bm.user_id
  where u.auth_user_id = auth.uid();
$$;

alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.inventory_events enable row level security;
alter table public.conversations enable row level security;
alter table public.sms_messages enable row level security;
alter table public.documents enable row level security;
alter table public.ai_extractions enable row level security;
alter table public.business_memories enable row level security;
alter table public.chatbot_sessions enable row level security;
alter table public.audit_logs enable row level security;

create policy customers_isolation on public.customers
  for all using (business_id in (select public.user_business_ids()))
  with check (business_id in (select public.user_business_ids()));

create policy products_isolation on public.products
  for all using (business_id in (select public.user_business_ids()))
  with check (business_id in (select public.user_business_ids()));

create policy orders_isolation on public.orders
  for all using (business_id in (select public.user_business_ids()))
  with check (business_id in (select public.user_business_ids()));

create policy payments_isolation on public.payments
  for all using (business_id in (select public.user_business_ids()))
  with check (business_id in (select public.user_business_ids()));

create policy inventory_isolation on public.inventory_events
  for all using (business_id in (select public.user_business_ids()))
  with check (business_id in (select public.user_business_ids()));

create policy extractions_isolation on public.ai_extractions
  for all using (business_id in (select public.user_business_ids()))
  with check (business_id in (select public.user_business_ids()));

create policy memories_isolation on public.business_memories
  for all using (business_id in (select public.user_business_ids()))
  with check (business_id in (select public.user_business_ids()));
