-- جدول رموز تحقق موحّد لتغيير البريد الإلكتروني أو رقم الجوال في الملف الشخصي:
-- يُرسل الرمز إلى القيمة الحالية (القديمة) لإثبات ملكيتها قبل السماح بتغييرها،
-- بنفس نمط جداول التحقق الأخرى (private.registration_otps وغيرها) — لا صلاحيات
-- عليه سوى service_role، فلا يُقرأ أو يُعدَّل مباشرة من العميل.
create table private.profile_change_otps (
  user_id uuid not null references auth.users(id) on delete cascade,
  field text not null check (field in ('email', 'phone')),
  new_value text not null,
  code text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (user_id, field)
);
alter table private.profile_change_otps enable row level security;
grant select, insert, update, delete on private.profile_change_otps to service_role;

create or replace function public.rpc_upsert_profile_change_otp(
  p_user_id uuid, p_field text, p_new_value text, p_code text, p_expires_at timestamptz
)
returns void
language sql
security definer
set search_path to 'public', 'private'
as $function$
  insert into private.profile_change_otps (user_id, field, new_value, code, attempts, expires_at)
  values (p_user_id, p_field, p_new_value, p_code, 0, p_expires_at)
  on conflict (user_id, field) do update
    set new_value = excluded.new_value, code = excluded.code, attempts = 0, expires_at = excluded.expires_at, created_at = now();
$function$;

create or replace function public.rpc_get_profile_change_otp(p_user_id uuid, p_field text)
returns table(new_value text, code text, attempts integer, expires_at timestamptz)
language sql
security definer
set search_path to 'public', 'private'
as $function$
  select new_value, code, attempts, expires_at from private.profile_change_otps where user_id = p_user_id and field = p_field;
$function$;

create or replace function public.rpc_increment_profile_change_otp_attempts(p_user_id uuid, p_field text)
returns void
language sql
security definer
set search_path to 'public', 'private'
as $function$
  update private.profile_change_otps set attempts = attempts + 1 where user_id = p_user_id and field = p_field;
$function$;

create or replace function public.rpc_delete_profile_change_otp(p_user_id uuid, p_field text)
returns void
language sql
security definer
set search_path to 'public', 'private'
as $function$
  delete from private.profile_change_otps where user_id = p_user_id and field = p_field;
$function$;

-- Postgres يمنح PUBLIC صلاحية EXECUTE افتراضيًا على أي دالة جديدة؛ هذه الدوال
-- تأخذ user_id كمعامل حرّ، فمنح anon/authenticated تنفيذها كان سيسمح لأي مستخدم
-- بقراءة رمز تحقق مستخدم آخر معلَّق وخطف عملية تغيير بريده/جواله — يجب أن تبقى
-- مقصورة على service_role فقط، بنفس نمط دوال OTP الأخرى في المشروع.
revoke execute on function public.rpc_upsert_profile_change_otp(uuid, text, text, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.rpc_get_profile_change_otp(uuid, text) from public, anon, authenticated;
revoke execute on function public.rpc_increment_profile_change_otp_attempts(uuid, text) from public, anon, authenticated;
revoke execute on function public.rpc_delete_profile_change_otp(uuid, text) from public, anon, authenticated;

-- فئة جديدة لتذاكر طلب تغيير الاسم التي يرفعها المستخدم للأدمن (الاسم لم يعد
-- قابلاً للتعديل الذاتي المباشر، يمرّ عبر مراجعة الأدمن).
alter table public.contact_messages drop constraint contact_messages_category_check;
alter table public.contact_messages add constraint contact_messages_category_check
  check (category = any (array['suggestion', 'complaint', 'technical_issue', 'name_change_request']));
