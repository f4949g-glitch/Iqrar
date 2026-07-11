-- سجل الرسائل النصية المُرسَلة يدويًا من لوحة تحكم الأدمن (منفصل عن رسائل OTP
-- التلقائية)، مع حالة كل رسالة لعرض هستري قابل للتدقيق. الإرسال الفعلي يتم فقط
-- عبر Edge Function admin-send-sms بصلاحية service_role؛ لا إدراج مباشر من العميل.
create table public.sms_messages (
  id uuid primary key default gen_random_uuid(),
  recipient_phone text not null,
  message text not null,
  status text not null check (status in ('sent', 'failed')),
  error_detail text,
  sent_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.sms_messages enable row level security;

revoke all on public.sms_messages from anon, authenticated;
grant select on public.sms_messages to authenticated;

create policy sms_messages_select_admin on public.sms_messages
  for select to authenticated
  using (private.is_admin());

create index sms_messages_created_at_idx on public.sms_messages (created_at desc);
