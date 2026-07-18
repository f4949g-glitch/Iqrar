-- إصلاح أمني: login_email_for_national_id كانت دالة SECURITY DEFINER ممنوحة
-- لـ anon تُعيد البريد الإلكتروني الحقيقي لأي رقم هوية يُمرَّر لها بلا أي تحقق
-- أو حد لعدد المحاولات — يتيح لأي طرف حصد بريد كل حساب مسجَّل عبر تجربة أرقام
-- هوية متتالية (صيغتها معروفة: 10 أرقام). تُستبدَل بدالة Edge Function خادمية
-- (login-with-national-id) تُنجز البحث والتحقق من كلمة المرور داخليًا فقط، ولا
-- يصل البريد الإلكتروني للمتصفح إطلاقًا.
drop function if exists public.login_email_for_national_id(text);

-- حدّ محاولات تسجيل الدخول برقم الهوية: يمنع تجربة آلاف كلمات المرور/أرقام
-- الهوية آليًا (Brute force) عبر تجميد الرقم مؤقتًا بعد عدد محاولات محدود ضمن
-- نافذة زمنية، بدل ترك الباب مفتوحًا بلا أي رقابة كما كان الحال.
create table private.national_id_login_attempts (
  national_id text primary key,
  attempts integer not null default 0,
  window_start timestamptz not null default now()
);
alter table private.national_id_login_attempts enable row level security;
revoke all on private.national_id_login_attempts from anon, authenticated;

-- يُعيد true إن كانت المحاولة مسموحة (ويزيد العدّاد)، أو false إن تجاوز الحد
-- (10 محاولات ضمن 15 دقيقة) فيُرفَض الطلب فورًا دون حتى محاولة التحقق من كلمة المرور.
create or replace function public.rpc_check_login_rate_limit(p_national_id text)
returns boolean
language plpgsql security definer set search_path = public, private
as $$
declare
  v_row private.national_id_login_attempts;
begin
  select * into v_row from private.national_id_login_attempts where national_id = p_national_id for update;

  if v_row.national_id is null then
    insert into private.national_id_login_attempts (national_id, attempts, window_start) values (p_national_id, 1, now());
    return true;
  end if;

  if v_row.window_start < now() - interval '15 minutes' then
    update private.national_id_login_attempts set attempts = 1, window_start = now() where national_id = p_national_id;
    return true;
  end if;

  if v_row.attempts >= 10 then
    return false;
  end if;

  update private.national_id_login_attempts set attempts = attempts + 1 where national_id = p_national_id;
  return true;
end;
$$;

-- يُستدعى بعد نجاح تسجيل الدخول لتصفير العدّاد، كي لا يُعاقَب المستخدم الشرعي
-- على محاولات فاشلة سابقة (كتابة خاطئة لكلمة المرور مثلًا) بعد أن أثبت هويته.
create or replace function public.rpc_reset_login_rate_limit(p_national_id text)
returns void
language sql security definer set search_path = public, private
as $$
  delete from private.national_id_login_attempts where national_id = p_national_id;
$$;

revoke execute on function
  public.rpc_check_login_rate_limit(text),
  public.rpc_reset_login_rate_limit(text)
from public, anon, authenticated;

grant execute on function
  public.rpc_check_login_rate_limit(text),
  public.rpc_reset_login_rate_limit(text)
to service_role;

-- إصلاح أمني: لا يوجد حاليًا أي حد لعدد طلبات رمز تحقق SMS/بريد لنفس الهدف
-- (تسجيل، استعادة كلمة مرور، توقيع)، مما يتيح إغراق رقم جوال برسائل بلا نهاية
-- (إزعاج + تكلفة SMS فعلية). نضيف "فترة تهدئة" بتحديث created_at في كل upsert
-- ليعكس وقت آخر طلب فعليًا (كان يبقى ثابتًا على وقت أول إدراج فقط)، فتتحقق
-- دوال Edge Function من الوقت المنقضي منذ آخر طلب قبل توليد رمز جديد.
create or replace function public.rpc_upsert_registration_otp(p_phone text, p_code text, p_expires_at timestamptz)
returns void
language sql security definer set search_path = public, private
as $$
  insert into private.registration_otps (phone, code, attempts, expires_at)
  values (p_phone, p_code, 0, p_expires_at)
  on conflict (phone) do update set code = excluded.code, attempts = 0, expires_at = excluded.expires_at, created_at = now();
$$;

create or replace function public.rpc_upsert_password_reset_otp(p_national_id text, p_code text, p_expires_at timestamptz)
returns void language sql security definer set search_path = public, private
as $$
  insert into private.password_reset_otps (national_id, code, attempts, expires_at)
  values (p_national_id, p_code, 0, p_expires_at)
  on conflict (national_id) do update set code = excluded.code, attempts = 0, expires_at = excluded.expires_at, created_at = now();
$$;

create or replace function public.rpc_upsert_signing_otp(p_party_id uuid, p_code text, p_expires_at timestamptz)
returns void language sql security definer set search_path = public, private
as $$
  insert into private.signing_otps (party_id, code, attempts, verified, expires_at)
  values (p_party_id, p_code, 0, false, p_expires_at)
  on conflict (party_id) do update set code = excluded.code, attempts = 0, verified = false, expires_at = excluded.expires_at, created_at = now();
$$;

create or replace function public.rpc_upsert_signing_identity_otp(p_party_id uuid, p_code text, p_expires_at timestamptz)
returns void language sql security definer set search_path = public, private
as $$
  insert into private.signing_identity_otps (party_id, code, attempts, verified, expires_at)
  values (p_party_id, p_code, 0, false, p_expires_at)
  on conflict (party_id) do update set code = excluded.code, attempts = 0, verified = false, expires_at = excluded.expires_at, created_at = now();
$$;
