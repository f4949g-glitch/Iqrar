-- تحويل صلاحية تعديل التسعير إلى نمط مباشر/بموافقة مطابق لأكواد الخصم والشحن.
-- بما أن إعدادات التسعير صف واحد فقط (لا صفوف متعددة قابلة لحمل حالة اعتماد)،
-- تُقدَّم طلبات التغيير في جدول منفصل يوافق عليها الأدمن الرئيسي فيُطبِّق القيم فعليًا.

create table public.pricing_change_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references public.profiles(id),
  base_amount numeric not null,
  extra_party_fee numeric not null,
  minimum_invoice numeric not null,
  tax_percent numeric not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.pricing_change_requests enable row level security;

create policy pricing_change_requests_select on public.pricing_change_requests
  for select
  using (private.is_admin() or requested_by = (select auth.uid()));

create policy pricing_change_requests_insert on public.pricing_change_requests
  for insert
  with check (
    requested_by = (select auth.uid())
    and status = 'pending'
    and private.has_permission('manage_pricing')
  );

create policy pricing_change_requests_update on public.pricing_change_requests
  for update
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists pricing_settings_update on public.pricing_settings;
create policy pricing_settings_update on public.pricing_settings
  for update
  using (private.is_admin() or private.has_permission('manage_pricing_direct'))
  with check (private.is_admin() or private.has_permission('manage_pricing_direct'));
