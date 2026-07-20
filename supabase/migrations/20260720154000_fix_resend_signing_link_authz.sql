-- resend_signing_link كانت SECURITY INVOKER بلا تحقق صريح من ملكية العقد داخل
-- الدالة نفسها، تعتمد فقط على RLS ضمنيًا (تحديثات contract_parties/contracts
-- تصمت بلا أثر لمستخدم غير المنشئ بدل رسالة خطأ واضحة، ثم يفشل الإدراج في
-- contract_events أخيرًا برسالة PostgreSQL خام غير مفهومة). التصحيح: SECURITY
-- DEFINER مع تحقق صريح ورسالة عربية واضحة، بنفس نمط send_contract.
create or replace function public.resend_signing_link(p_party_id uuid)
returns public.contract_parties
language plpgsql security definer set search_path = public
as $$
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

  select * into v_contract from public.contracts where id = v_party.contract_id;
  if v_contract.id is null then
    raise exception 'العقد غير موجود';
  end if;
  if v_contract.created_by <> auth.uid() then
    raise exception 'غير مصرح لك بإعادة إرسال رابط توقيع لهذا العقد';
  end if;

  if v_party.status not in ('pending', 'viewed', 'rejected') then
    raise exception 'هذا الطرف وقّع بالفعل';
  end if;
  if v_party.reject_resend_count >= 3 then
    raise exception 'تم استنفاد عدد مرات إعادة الإرسال المسموح بها (٣ مرات) لهذا الطرف';
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

revoke all on function public.resend_signing_link(uuid) from public, anon;
grant execute on function public.resend_signing_link(uuid) to authenticated;
