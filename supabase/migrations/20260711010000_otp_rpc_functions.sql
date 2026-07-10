-- بديل عن الوصول المباشر لمخطط private عبر REST (`.schema('private').from(...)`)
-- الذي يتطلب إدراج "private" ضمن "Exposed schemas" في إعدادات Data API بلوحة
-- تحكم Supabase — إعداد لا يمكن ضبطه عبر SQL/migrations، فسبّب فشل كل عمليات
-- OTP (تسجيل، توقيع، استعادة كلمة مرور) بخطأ 500 دون أي تفسير. الدوال التالية
-- تعيش في public (مخطط مكشوف دائمًا) وتصل لجداول private داخليًا عبر
-- SECURITY DEFINER، وتُمنح فقط لـ service_role — لا يمكن لـ anon/authenticated
-- استدعاءها إطلاقًا.

-- registration_otps
create or replace function public.rpc_upsert_registration_otp(p_phone text, p_code text, p_expires_at timestamptz)
returns void
language sql security definer set search_path = public, private
as $$
  insert into private.registration_otps (phone, code, attempts, expires_at)
  values (p_phone, p_code, 0, p_expires_at)
  on conflict (phone) do update set code = excluded.code, attempts = 0, expires_at = excluded.expires_at;
$$;

create or replace function public.rpc_get_registration_otp(p_phone text)
returns table(code text, attempts integer, expires_at timestamptz)
language sql security definer set search_path = public, private
as $$
  select code, attempts, expires_at from private.registration_otps where phone = p_phone;
$$;

create or replace function public.rpc_increment_registration_otp_attempts(p_phone text)
returns void language sql security definer set search_path = public, private
as $$
  update private.registration_otps set attempts = attempts + 1 where phone = p_phone;
$$;

create or replace function public.rpc_delete_registration_otp(p_phone text)
returns void language sql security definer set search_path = public, private
as $$
  delete from private.registration_otps where phone = p_phone;
$$;

-- signing_otps
create or replace function public.rpc_upsert_signing_otp(p_party_id uuid, p_code text, p_expires_at timestamptz)
returns void language sql security definer set search_path = public, private
as $$
  insert into private.signing_otps (party_id, code, attempts, verified, expires_at)
  values (p_party_id, p_code, 0, false, p_expires_at)
  on conflict (party_id) do update set code = excluded.code, attempts = 0, verified = false, expires_at = excluded.expires_at;
$$;

create or replace function public.rpc_get_signing_otp(p_party_id uuid)
returns table(code text, attempts integer, verified boolean, expires_at timestamptz)
language sql security definer set search_path = public, private
as $$
  select code, attempts, verified, expires_at from private.signing_otps where party_id = p_party_id;
$$;

create or replace function public.rpc_increment_signing_otp_attempts(p_party_id uuid)
returns void language sql security definer set search_path = public, private
as $$
  update private.signing_otps set attempts = attempts + 1 where party_id = p_party_id;
$$;

create or replace function public.rpc_mark_signing_otp_verified(p_party_id uuid)
returns void language sql security definer set search_path = public, private
as $$
  update private.signing_otps set verified = true where party_id = p_party_id;
$$;

-- password_reset_otps
create or replace function public.rpc_upsert_password_reset_otp(p_national_id text, p_code text, p_expires_at timestamptz)
returns void language sql security definer set search_path = public, private
as $$
  insert into private.password_reset_otps (national_id, code, attempts, expires_at)
  values (p_national_id, p_code, 0, p_expires_at)
  on conflict (national_id) do update set code = excluded.code, attempts = 0, expires_at = excluded.expires_at;
$$;

create or replace function public.rpc_get_password_reset_otp(p_national_id text)
returns table(code text, attempts integer, expires_at timestamptz)
language sql security definer set search_path = public, private
as $$
  select code, attempts, expires_at from private.password_reset_otps where national_id = p_national_id;
$$;

create or replace function public.rpc_increment_password_reset_otp_attempts(p_national_id text)
returns void language sql security definer set search_path = public, private
as $$
  update private.password_reset_otps set attempts = attempts + 1 where national_id = p_national_id;
$$;

create or replace function public.rpc_delete_password_reset_otp(p_national_id text)
returns void language sql security definer set search_path = public, private
as $$
  delete from private.password_reset_otps where national_id = p_national_id;
$$;

-- تأمين: هذه الدوال تلمس رموز تحقق حسّاسة، ويجب ألا يصلها إلا service_role
-- (Edge Functions) رغم أن public مخطط مكشوف افتراضيًا لـ anon/authenticated.
revoke execute on function
  public.rpc_upsert_registration_otp(text, text, timestamptz),
  public.rpc_get_registration_otp(text),
  public.rpc_increment_registration_otp_attempts(text),
  public.rpc_delete_registration_otp(text),
  public.rpc_upsert_signing_otp(uuid, text, timestamptz),
  public.rpc_get_signing_otp(uuid),
  public.rpc_increment_signing_otp_attempts(uuid),
  public.rpc_mark_signing_otp_verified(uuid),
  public.rpc_upsert_password_reset_otp(text, text, timestamptz),
  public.rpc_get_password_reset_otp(text),
  public.rpc_increment_password_reset_otp_attempts(text),
  public.rpc_delete_password_reset_otp(text)
from public, anon, authenticated;

grant execute on function
  public.rpc_upsert_registration_otp(text, text, timestamptz),
  public.rpc_get_registration_otp(text),
  public.rpc_increment_registration_otp_attempts(text),
  public.rpc_delete_registration_otp(text),
  public.rpc_upsert_signing_otp(uuid, text, timestamptz),
  public.rpc_get_signing_otp(uuid),
  public.rpc_increment_signing_otp_attempts(uuid),
  public.rpc_mark_signing_otp_verified(uuid),
  public.rpc_upsert_password_reset_otp(text, text, timestamptz),
  public.rpc_get_password_reset_otp(text),
  public.rpc_increment_password_reset_otp_attempts(text),
  public.rpc_delete_password_reset_otp(text)
to service_role;
