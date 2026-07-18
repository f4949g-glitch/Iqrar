-- إضافة created_at لمخرجات دوال "جلب" رموز OTP، لتستطيع دوال Edge Function
-- حساب الوقت المنقضي منذ آخر طلب وتطبيق فترة تهدئة بين الطلبات المتكررة —
-- CREATE OR REPLACE لا يسمح بتغيير نوع الإرجاع، لذا يلزم DROP أولًا.
drop function if exists public.rpc_get_registration_otp(text);
create or replace function public.rpc_get_registration_otp(p_phone text)
returns table(code text, attempts integer, expires_at timestamptz, created_at timestamptz)
language sql security definer set search_path = public, private
as $$
  select code, attempts, expires_at, created_at from private.registration_otps where phone = p_phone;
$$;

drop function if exists public.rpc_get_password_reset_otp(text);
create or replace function public.rpc_get_password_reset_otp(p_national_id text)
returns table(code text, attempts integer, expires_at timestamptz, created_at timestamptz)
language sql security definer set search_path = public, private
as $$
  select code, attempts, expires_at, created_at from private.password_reset_otps where national_id = p_national_id;
$$;

drop function if exists public.rpc_get_signing_otp(uuid);
create or replace function public.rpc_get_signing_otp(p_party_id uuid)
returns table(code text, attempts integer, verified boolean, expires_at timestamptz, created_at timestamptz)
language sql security definer set search_path = public, private
as $$
  select code, attempts, verified, expires_at, created_at from private.signing_otps where party_id = p_party_id;
$$;

drop function if exists public.rpc_get_signing_identity_otp(uuid);
create or replace function public.rpc_get_signing_identity_otp(p_party_id uuid)
returns table(code text, attempts integer, verified boolean, expires_at timestamptz, created_at timestamptz)
language sql security definer set search_path = public, private
as $$
  select code, attempts, verified, expires_at, created_at from private.signing_identity_otps where party_id = p_party_id;
$$;

revoke execute on function
  public.rpc_get_registration_otp(text),
  public.rpc_get_password_reset_otp(text),
  public.rpc_get_signing_otp(uuid),
  public.rpc_get_signing_identity_otp(uuid)
from public, anon, authenticated;

grant execute on function
  public.rpc_get_registration_otp(text),
  public.rpc_get_password_reset_otp(text),
  public.rpc_get_signing_otp(uuid),
  public.rpc_get_signing_identity_otp(uuid)
to service_role;
