-- إعادة إرسال العقد للطرف الرافض (٣ مرات كحد أقصى)، وربط مدة صلاحية التوثيق
-- بحدّ يحدده منشئ العقد بين يوم و١٤ يومًا.

alter table public.contract_parties
  add column reject_resend_count integer not null default 0;

-- not valid: توجد عقود اختبار قديمة بقيم مدة خارج المدى الجديد (٩٠، ٣٠٠ يومًا)؛
-- القيد يُطبَّق على أي إدراج/تعديل جديد فقط دون كسر البيانات التاريخية.
alter table public.contracts
  add constraint contracts_duration_days_range check (duration_days is null or (duration_days between 1 and 14)) not valid;

-- send_contract: يشترط الآن أن يكون duration_days محددًا وضمن المدى (١-١٤ يومًا).
create or replace function public.send_contract(p_contract_id uuid)
returns public.contracts
language plpgsql security invoker set search_path = public as $$
declare
  v_row public.contracts;
  v_party_count integer;
  v_pricing public.pricing_settings;
  v_base numeric;
  v_final numeric;
  v_code public.discount_codes;
  v_uses_total integer;
  v_uses_by_user integer;
  v_balance numeric;
  v_is_admin boolean;
begin
  select * into v_row from public.contracts where id = p_contract_id;
  if v_row.id is null then
    raise exception 'العقد غير موجود';
  end if;
  if v_row.status <> 'draft' then
    raise exception 'العقد ليس في حالة مسودة';
  end if;
  if v_row.duration_days is null or v_row.duration_days < 1 or v_row.duration_days > 14 then
    raise exception 'حدد مدة صلاحية التوثيق (بين يوم و١٤ يومًا) قبل الإرسال';
  end if;

  select count(*) into v_party_count from public.contract_parties where contract_id = p_contract_id;
  if v_party_count = 0 then
    raise exception 'أضف طرفًا واحدًا على الأقل قبل الإرسال';
  end if;

  select * into v_pricing from public.pricing_settings where id = 1;
  v_base := greatest(v_pricing.base_amount + greatest(v_party_count - 2, 0) * v_pricing.extra_party_fee, v_pricing.minimum_invoice);
  v_base := round(v_base * (1 + v_pricing.tax_percent / 100), 2);
  v_final := v_base;

  if v_row.discount_code_id is not null then
    select * into v_code from public.discount_codes where id = v_row.discount_code_id;

    if v_code.id is null or not v_code.is_active
       or (v_code.starts_at is not null and now() < v_code.starts_at)
       or (v_code.ends_at is not null and now() > v_code.ends_at) then
      raise exception 'كود الخصم لم يعد صالحًا، يرجى إزالته أو استبداله';
    end if;

    select count(*) into v_uses_total from public.discount_code_uses where discount_code_id = v_code.id;
    if v_code.max_uses is not null and v_uses_total >= v_code.max_uses then
      raise exception 'تم استنفاد عدد مرات استخدام كود الخصم';
    end if;

    select count(*) into v_uses_by_user from public.discount_code_uses where discount_code_id = v_code.id and used_by = auth.uid();
    if v_code.max_uses_per_user is not null and v_uses_by_user >= v_code.max_uses_per_user then
      raise exception 'استنفدت عدد مرات استخدامك المسموحة لكود الخصم';
    end if;
  end if;

  select private.is_admin() into v_is_admin;

  if not v_is_admin then
    if v_row.discount_code_id is not null then
      v_final := round(v_base * (1 - v_code.discount_percent / 100), 2);
    end if;

    select credit_balance into v_balance from public.profiles where id = auth.uid();
    if coalesce(v_balance, 0) < v_final then
      raise exception 'رصيدك الحالي (% ريال) لا يكفي لإتمام هذا العقد (التكلفة % ريال). اشحن رصيدك بكود شحن ثم أعد المحاولة', coalesce(v_balance, 0), v_final;
    end if;

    update public.profiles set credit_balance = credit_balance - v_final where id = auth.uid();
  elsif v_row.discount_code_id is not null then
    v_final := round(v_base * (1 - v_code.discount_percent / 100), 2);
  end if;

  if v_row.discount_code_id is not null then
    insert into public.discount_code_uses (discount_code_id, contract_id, used_by) values (v_row.discount_code_id, p_contract_id, auth.uid());
  end if;

  update public.contracts
  set status = 'pending',
      sent_at = now(),
      updated_at = now(),
      invoice_amount = v_final,
      expires_at = now() + (duration_days || ' days')::interval
  where id = p_contract_id
  returning * into v_row;

  insert into public.contract_events (contract_id, event_type, message)
  values (p_contract_id, 'sent', 'تم إرسال العقد لأطرافه للتوثيق');

  return v_row;
end;
$$;

-- resend_to_rejected_party: يعيد فتح باب التوقيع لطرف رفض العقد تحديدًا، بحد
-- أقصى ٣ محاولات لكل طرف، ويجدّد صلاحية التوثيق حسب duration_days المخزّنة.
create or replace function public.resend_to_rejected_party(p_party_id uuid)
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
  if v_party.status <> 'rejected' then
    raise exception 'هذا الطرف لم يرفض العقد';
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
  set status = 'pending', reject_resend_count = reject_resend_count + 1
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

revoke all on function public.resend_to_rejected_party(uuid) from public;
grant execute on function public.resend_to_rejected_party(uuid) to authenticated;
