alter table public.businesses
  add column if not exists phone text;

alter table public.order_items enable row level security;
alter table public.businesses enable row level security;
alter table public.users enable row level security;
alter table public.business_members enable row level security;
alter table public.sms_messages enable row level security;
alter table public.documents enable row level security;
alter table public.conversations enable row level security;
alter table public.chatbot_sessions enable row level security;
alter table public.chatbot_messages enable row level security;
alter table public.audit_logs enable row level security;
alter table public.memory_embeddings enable row level security;

drop policy if exists order_items_isolation on public.order_items;
create policy order_items_isolation on public.order_items
  for all using (
    order_id in (
      select o.id from public.orders o
      where o.business_id in (select public.user_business_ids())
    )
  )
  with check (
    order_id in (
      select o.id from public.orders o
      where o.business_id in (select public.user_business_ids())
    )
  );

drop policy if exists businesses_isolation on public.businesses;
create policy businesses_isolation on public.businesses
  for all using (id in (select public.user_business_ids()))
  with check (id in (select public.user_business_ids()));

drop policy if exists members_isolation on public.business_members;
create policy members_isolation on public.business_members
  for all using (business_id in (select public.user_business_ids()))
  with check (business_id in (select public.user_business_ids()));

drop policy if exists users_self on public.users;
create policy users_self on public.users
  for select using (auth_user_id = auth.uid());

drop policy if exists conversations_isolation on public.conversations;
create policy conversations_isolation on public.conversations
  for all using (business_id in (select public.user_business_ids()))
  with check (business_id in (select public.user_business_ids()));

drop policy if exists sms_isolation on public.sms_messages;
create policy sms_isolation on public.sms_messages
  for all using (business_id in (select public.user_business_ids()))
  with check (business_id in (select public.user_business_ids()));

drop policy if exists documents_isolation on public.documents;
create policy documents_isolation on public.documents
  for all using (business_id in (select public.user_business_ids()))
  with check (business_id in (select public.user_business_ids()));

drop policy if exists chatbot_sessions_isolation on public.chatbot_sessions;
create policy chatbot_sessions_isolation on public.chatbot_sessions
  for all using (business_id in (select public.user_business_ids()))
  with check (business_id in (select public.user_business_ids()));

drop policy if exists chatbot_messages_isolation on public.chatbot_messages;
create policy chatbot_messages_isolation on public.chatbot_messages
  for all using (
    session_id in (
      select s.id from public.chatbot_sessions s
      where s.business_id in (select public.user_business_ids())
    )
  )
  with check (
    session_id in (
      select s.id from public.chatbot_sessions s
      where s.business_id in (select public.user_business_ids())
    )
  );

drop policy if exists audit_isolation on public.audit_logs;
create policy audit_isolation on public.audit_logs
  for all using (business_id in (select public.user_business_ids()))
  with check (business_id in (select public.user_business_ids()));

drop policy if exists embeddings_isolation on public.memory_embeddings;
create policy embeddings_isolation on public.memory_embeddings
  for all using (business_id in (select public.user_business_ids()))
  with check (business_id in (select public.user_business_ids()));
