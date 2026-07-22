-- FreBob auth onboarding RLS (run after 001–003)
-- Allows authenticated users to upsert their public.users row and create
-- their first owned business + membership without chicken-egg failures.
-- Express API still uses the service role; these policies support PostgREST/anon paths.

-- Users: insert / update own profile row
drop policy if exists users_insert_self on public.users;
create policy users_insert_self on public.users
  for insert
  with check (auth_user_id = auth.uid());

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- Keep select policy from 002 (users_self)

-- Businesses: allow INSERT when caller owns the row (first business)
-- Replace FOR ALL isolation with granular policies so INSERT is not blocked
-- by user_business_ids() (empty before membership exists).

drop policy if exists businesses_isolation on public.businesses;

drop policy if exists businesses_select on public.businesses;
create policy businesses_select on public.businesses
  for select
  using (id in (select public.user_business_ids()));

drop policy if exists businesses_update on public.businesses;
create policy businesses_update on public.businesses
  for update
  using (id in (select public.user_business_ids()))
  with check (id in (select public.user_business_ids()));

drop policy if exists businesses_delete on public.businesses;
create policy businesses_delete on public.businesses
  for delete
  using (id in (select public.user_business_ids()));

drop policy if exists businesses_insert_owner on public.businesses;
create policy businesses_insert_owner on public.businesses
  for insert
  with check (
    owner_user_id in (
      select u.id from public.users u where u.auth_user_id = auth.uid()
    )
  );

-- Members: allow first membership when user is self and owns the business

drop policy if exists members_isolation on public.business_members;

drop policy if exists members_select on public.business_members;
create policy members_select on public.business_members
  for select
  using (business_id in (select public.user_business_ids()));

drop policy if exists members_update on public.business_members;
create policy members_update on public.business_members
  for update
  using (business_id in (select public.user_business_ids()))
  with check (business_id in (select public.user_business_ids()));

drop policy if exists members_delete on public.business_members;
create policy members_delete on public.business_members
  for delete
  using (business_id in (select public.user_business_ids()));

drop policy if exists members_insert_owner on public.business_members;
create policy members_insert_owner on public.business_members
  for insert
  with check (
    user_id in (
      select u.id from public.users u where u.auth_user_id = auth.uid()
    )
    and business_id in (
      select b.id
      from public.businesses b
      where b.owner_user_id in (
        select u.id from public.users u where u.auth_user_id = auth.uid()
      )
    )
  );
