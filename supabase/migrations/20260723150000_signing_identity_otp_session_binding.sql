-- تحقق الهوية عبر SMS كان يُخزَّن دومًا كعلم verified دائم مرتبط بالطرف فقط
-- (private.signing_identity_otps.party_id)، فبمجرد نجاح التحقق مرة واحدة يبقى
-- "verified = true" للأبد بلا أي انتهاء صلاحية أو ربط بجلسة معيَّنة — فأي شخص
-- يحصل على رابط التوثيق نفسه لاحقًا (بإعادة فتحه، أو نسخه واستخدامه في متصفح/
-- جهاز آخر) يدخل مباشرة دون طلب رمز تحقق جديد، حتى لو لم يكن هو صاحب الجوال
-- الأصلي. الإصلاح: ربط حالة "verified" بجلسة عشوائية (session_id) يولّدها
-- المتصفح عند كل طلب رمز تحقق جديد ويُخزِّنها في sessionStorage (يُمحى تلقائيًا
-- عند إغلاق التبويب، ولا يُشارَك بين تبويبات/أجهزة مختلفة) — فتح الرابط من
-- جديد (تبويب جديد، متصفح آخر، أو بعد إغلاق التبويب السابق) يعني عدم وجود
-- session_id مطابق، فتُعامَل الهوية على أنها غير متحقَّق منها ويُطلَب رمز جديد،
-- بينما يبقى التحقق ساريًا بلا إزعاج طوال بقاء نفس التبويب مفتوحًا (تحديث
-- الصفحة أو التنقل داخل نفس الجلسة لا يُفقد التحقق).
alter table private.signing_identity_otps add column session_id text;

drop function if exists public.rpc_upsert_signing_identity_otp(uuid, text, timestamptz);
create or replace function public.rpc_upsert_signing_identity_otp(p_party_id uuid, p_code text, p_expires_at timestamptz, p_session_id text)
returns void language sql security definer set search_path = public, private
as $$
  insert into private.signing_identity_otps (party_id, code, attempts, verified, expires_at, session_id)
  values (p_party_id, p_code, 0, false, p_expires_at, p_session_id)
  on conflict (party_id) do update set
    code = excluded.code,
    attempts = 0,
    verified = false,
    expires_at = excluded.expires_at,
    created_at = now(),
    session_id = excluded.session_id;
$$;

drop function if exists public.rpc_get_signing_identity_otp(uuid);
create or replace function public.rpc_get_signing_identity_otp(p_party_id uuid)
returns table(code text, attempts integer, verified boolean, expires_at timestamptz, created_at timestamptz, session_id text)
language sql security definer set search_path = public, private
as $$
  select code, attempts, verified, expires_at, created_at, session_id from private.signing_identity_otps where party_id = p_party_id;
$$;

revoke execute on function
  public.rpc_upsert_signing_identity_otp(uuid, text, timestamptz, text),
  public.rpc_get_signing_identity_otp(uuid)
from public, anon, authenticated;

grant execute on function
  public.rpc_upsert_signing_identity_otp(uuid, text, timestamptz, text),
  public.rpc_get_signing_identity_otp(uuid)
to service_role;
