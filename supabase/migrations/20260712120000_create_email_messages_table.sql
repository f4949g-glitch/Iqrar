-- سجل رسائل البريد الإلكتروني المُرسَلة يدويًا من لوحة تحكم الأدمن (نظير
-- sms_messages)، للاطلاع لاحقًا على ما أُرسل ونتيجته.
create table public.email_messages (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null,
  subject text not null,
  message text not null,
  status text not null check (status in ('sent','failed')),
  error_detail text,
  sent_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.email_messages enable row level security;

create policy email_messages_select_admin on public.email_messages for select using (private.is_admin());
