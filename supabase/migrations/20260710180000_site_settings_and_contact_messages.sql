-- إعدادات هوية المنشأة (سجل واحد) + رسائل اتصل بنا (خدمة العملاء).

create table public.site_settings (
  id int primary key default 1 check (id = 1),
  org_name text not null default 'منصة إقرار لخدمات الأعمال',
  logo_data_url text,
  contact_phone text,
  contact_email text,
  social_instagram text,
  social_x text,
  social_other_label text,
  social_other_url text,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id) values (1);

alter table public.site_settings enable row level security;

create policy site_settings_select on public.site_settings
  for select
  using (true);

create policy site_settings_update on public.site_settings
  for update
  using (private.is_admin())
  with check (private.is_admin());

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  category text not null check (category in ('suggestion', 'complaint', 'technical_issue')),
  message text not null,
  created_by uuid references public.profiles(id),
  status text not null default 'new' check (status in ('new', 'read')),
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

create policy contact_messages_insert on public.contact_messages
  for insert
  with check (true);

create policy contact_messages_select on public.contact_messages
  for select
  using (private.is_admin());

create policy contact_messages_update on public.contact_messages
  for update
  using (private.is_admin())
  with check (private.is_admin());
