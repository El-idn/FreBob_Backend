-- Allow CaptureSource 'voice' on extractions and approved orders.
-- Constraint names confirmed on production: ai_extractions_source_check, orders_source_check.

alter table public.ai_extractions drop constraint if exists ai_extractions_source_check;
alter table public.ai_extractions
  add constraint ai_extractions_source_check
  check (source in ('whatsapp', 'sms', 'scanner', 'manual', 'voice'));

alter table public.orders drop constraint if exists orders_source_check;
alter table public.orders
  add constraint orders_source_check
  check (source in ('whatsapp', 'sms', 'scanner', 'manual', 'voice'));
