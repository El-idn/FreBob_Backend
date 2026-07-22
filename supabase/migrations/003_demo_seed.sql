-- FreBob demo seed (Chinedu Gadgets) — safe to re-run
-- Aligns with server/src/data/seed.ts fixed UUIDs

insert into public.users (id, name, email, preferred_language)
values (
  '00000000-0000-4000-8000-000000000010',
  'Chinedu Okafor',
  'chinedu@frebob.demo',
  'en'
)
on conflict (id) do nothing;

insert into public.businesses (
  id, name, category, location, currency, preferred_language, owner_user_id, phone
)
values (
  '00000000-0000-4000-8000-000000000001',
  'Chinedu Gadgets',
  'Electronics retail',
  'Alaba, Lagos',
  'NGN',
  'en',
  '00000000-0000-4000-8000-000000000010',
  '+234 801 000 0000'
)
on conflict (id) do nothing;

insert into public.business_members (business_id, user_id, role)
values (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000010',
  'owner'
)
on conflict (business_id, user_id) do nothing;

insert into public.products (
  id, business_id, name, variant, unit_price, available, reserved, low_stock_threshold
)
values
  ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000001', 'Samsung A15', '128GB', 185000, 12, 0, 4),
  ('00000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000001', 'Samsung A05', '64GB', 115000, 8, 1, 3),
  ('00000000-0000-4000-8000-000000000023', '00000000-0000-4000-8000-000000000001', 'Galaxy Buds FE', null, 75000, 3, 0, 4),
  ('00000000-0000-4000-8000-000000000024', '00000000-0000-4000-8000-000000000001', '25W Fast Charger', null, 12000, 25, 0, 5)
on conflict (id) do nothing;

insert into public.customers (id, business_id, name, phone, balance_owed)
values
  ('00000000-0000-4000-8000-000000000031', '00000000-0000-4000-8000-000000000001', 'Ada Okoro', '0803 111 2233', 0),
  ('00000000-0000-4000-8000-000000000032', '00000000-0000-4000-8000-000000000001', 'Tunde Bello', '0812 444 5566', 45000),
  ('00000000-0000-4000-8000-000000000033', '00000000-0000-4000-8000-000000000001', 'Amina Yusuf', '0901 777 8899', 0)
on conflict (id) do nothing;
