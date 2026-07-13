-- تحقق هوية عبر رمز SMS عند فتح طرف "يدوي" لرابط التوقيع، منفصل تمامًا عن
-- private.signing_otps (مخصَّص حصرًا لإعادة استخدام توقيع محفوظ في الملف
-- الشخصي، وقيده الأساسي party_id فريد لكل طرف فلا يحتمل غرضين مختلفين معًا).
create table private.signing_identity_otps (
  party_id uuid primary key references public.contract_parties(id) on delete cascade,
  code text not null,
  attempts integer not null default 0,
  verified boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table private.signing_identity_otps enable row level security;
revoke all on private.signing_identity_otps from anon, authenticated;

create or replace function public.rpc_upsert_signing_identity_otp(p_party_id uuid, p_code text, p_expires_at timestamptz)
returns void language sql security definer set search_path = public, private
as $$
  insert into private.signing_identity_otps (party_id, code, attempts, verified, expires_at)
  values (p_party_id, p_code, 0, false, p_expires_at)
  on conflict (party_id) do update set code = excluded.code, attempts = 0, verified = false, expires_at = excluded.expires_at;
$$;

create or replace function public.rpc_get_signing_identity_otp(p_party_id uuid)
returns table(code text, attempts integer, verified boolean, expires_at timestamptz)
language sql security definer set search_path = public, private
as $$
  select code, attempts, verified, expires_at from private.signing_identity_otps where party_id = p_party_id;
$$;

create or replace function public.rpc_increment_signing_identity_otp_attempts(p_party_id uuid)
returns void language sql security definer set search_path = public, private
as $$
  update private.signing_identity_otps set attempts = attempts + 1 where party_id = p_party_id;
$$;

create or replace function public.rpc_mark_signing_identity_otp_verified(p_party_id uuid)
returns void language sql security definer set search_path = public, private
as $$
  update private.signing_identity_otps set verified = true where party_id = p_party_id;
$$;

revoke execute on function
  public.rpc_upsert_signing_identity_otp(uuid, text, timestamptz),
  public.rpc_get_signing_identity_otp(uuid),
  public.rpc_increment_signing_identity_otp_attempts(uuid),
  public.rpc_mark_signing_identity_otp_verified(uuid)
from public, anon, authenticated;

grant execute on function
  public.rpc_upsert_signing_identity_otp(uuid, text, timestamptz),
  public.rpc_get_signing_identity_otp(uuid),
  public.rpc_increment_signing_identity_otp_attempts(uuid),
  public.rpc_mark_signing_identity_otp_verified(uuid)
to service_role;

-- resend_signing_link: يعمّم resend_to_rejected_party السابقة لتشمل أي طرف لم
-- يوقّع بعد (pending/viewed/rejected) بدل المرفوض فقط. الحالة تُقلَب لـ pending
-- فقط إذا كان الطرف قد رفض سابقًا (يعيد فتح باب التوقيع له)؛ pending/viewed
-- تبقيان كما هما لأنه لم يرفض شيئًا بعد. reject_resend_count يبقى نفس العمود
-- ويُستخدَم الآن كعدّاد إرسال عام بنفس السقف (3 مرات لكل طرف).
drop function if exists public.resend_to_rejected_party(uuid);

create or replace function public.resend_signing_link(p_party_id uuid)
returns public.contract_parties
language plpgsql security invoker set search_path = public as $$
declare
  v_party public.contract_parties;
  v_contract public.contracts;
  v_other_signed boolean;
  v_new_status text;
begin
  select * into v_party from public.contract_parties where id = p_party_id;
  if v_party.id is null then
    raise exception 'الطرف غير موجود';
  end if;
  if v_party.status not in ('pending', 'viewed', 'rejected') then
    raise exception 'هذا الطرف وقّع بالفعل';
  end if;
  if v_party.reject_resend_count >= 3 then
    raise exception 'تم استنفاد عدد مرات إعادة الإرسال المسموح بها (٣ مرات) لهذا الطرف';
  end if;

  select * into v_contract from public.contracts where id = v_party.contract_id;
  if v_contract.id is null then
    raise exception 'العقد غير موجود';
  end if;
  if v_contract.duration_days is null or v_contract.duration_days < 1 or v_contract.duration_days > 14 then
    raise exception 'مدة صلاحية التوثيق يجب أن تكون بين يوم و١٤ يومًا';
  end if;

  update public.contract_parties
  set status = case when status = 'rejected' then 'pending' else status end,
      reject_resend_count = reject_resend_count + 1
  where id = p_party_id
  returning * into v_party;

  select exists (
    select 1 from public.contract_parties where contract_id = v_contract.id and status = 'signed'
  ) into v_other_signed;

  v_new_status := case when v_other_signed then 'partially_completed' else 'pending' end;

  update public.contracts
  set status = v_new_status,
      expires_at = now() + (v_contract.duration_days || ' days')::interval,
      updated_at = now()
  where id = v_contract.id;

  insert into public.contract_events (contract_id, party_id, event_type, message)
  values (
    v_contract.id,
    p_party_id,
    'resent_to_party',
    'أُعيد إرسال طلب التوثيق إلى ' || coalesce(v_party.full_name, 'الطرف') || ' (المحاولة ' || v_party.reject_resend_count || ' من 3)'
  );

  return v_party;
end;
$$;

revoke all on function public.resend_signing_link(uuid) from public;
grant execute on function public.resend_signing_link(uuid) to authenticated;
