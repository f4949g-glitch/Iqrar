-- إتاحة الخصم من الرصيد المتاح (كليًا أو جزئيًا) في بوابة الدفع: كانت
-- disable_balance_check_send_contract (20260710120000) عطّلت خصم الرصيد
-- بالكامل مؤقتًا (لعدم وجود بوابة دفع حقيقية آنذاك تغطي الفرق)، فبقي رصيد
-- المستخدم (المشحون عبر أكواد الشحن) بلا أي استخدام فعلي في المنصة. الآن
-- تقبل send_contract مبلغ رصيد اختياريًا يريد المستخدم استخدامه (يُحدَّده في
-- بوابة الدفع بالواجهة)، تخصمه من رصيده إن كان كافيًا، ويبقى الفرق (إن وُجد)
-- "مدفوعًا" عبر حقول البطاقة التجريبية الحالية إلى حين ربط بوابة دفع حقيقية.
alter table public.contracts add column credit_used numeric not null default 0;

drop function if exists public.send_contract(uuid);

create or replace function public.send_contract(p_contract_id uuid, p_use_balance_amount numeric default 0)
returns public.contracts
language plpgsql security definer set search_path = public
as $$
declare
  v_row public.contracts;
  v_party_count integer;
  v_pricing public.pricing_settings;
  v_base numeric;
  v_final numeric;
  v_code public.discount_codes;
  v_uses_total integer;
  v_uses_by_user integer;
  v_was_resend boolean;
  v_credit_to_use numeric;
  v_balance numeric;
begin
  select * into v_row from public.contracts where id = p_contract_id;
  if v_row.id is null then
    raise exception 'العقد غير موجود';
  end if;
  if v_row.created_by <> auth.uid() then
    raise exception 'غير مصرح لك بإرسال هذا العقد';
  end if;
  if v_row.status not in ('draft', 'rejected', 'expired') then
    raise exception 'العقد ليس في حالة مسودة';
  end if;
  v_was_resend := v_row.status in ('rejected', 'expired');
  if v_row.duration_days is null or v_row.duration_days < 1 or v_row.duration_days > 14 then
    raise exception 'حدد مدة صلاحية التوثيق (بين يوم و١٤ يومًا) قبل الإرسال';
  end if;
  if v_row.source_type = 'pdf' and v_row.original_file_path is null then
    raise exception 'ارفع ملف PDF أولًا قبل إرسال العقد';
  end if;
  if v_row.source_type = 'editor' and v_row.body_json is null then
    raise exception 'أكمل كتابة محتوى العقد أولًا قبل الإرسال';
  end if;

  select count(*) into v_party_count from public.contract_parties where contract_id = p_contract_id;
  if v_row.document_type = 'power_of_attorney' then
    if v_party_count <> 1 then
      raise exception 'التفويض يكون بطرف واحد فقط (الموكِّل)';
    end if;
  elsif v_party_count < 2 then
    raise exception 'يلزم طرفان على الأقل لإرسال العقد';
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

  if v_row.discount_code_id is not null then
    v_final := round(v_base * (1 - v_code.discount_percent / 100), 2);
  end if;

  if v_row.discount_code_id is not null then
    insert into public.discount_code_uses (discount_code_id, contract_id, used_by) values (v_row.discount_code_id, p_contract_id, auth.uid());
  end if;

  v_credit_to_use := least(greatest(coalesce(p_use_balance_amount, 0), 0), v_final);
  if v_credit_to_use > 0 then
    select credit_balance into v_balance from public.profiles where id = auth.uid();
    if v_balance is null or v_balance < v_credit_to_use then
      raise exception 'رصيدك الحالي أقل من المبلغ المطلوب خصمه من الرصيد';
    end if;
    update public.profiles set credit_balance = credit_balance - v_credit_to_use where id = auth.uid();
  end if;

  if v_was_resend then
    update public.contract_parties
    set status = 'pending',
        signed_at = null,
        nafath_trans_id = null,
        nafath_random_code = null,
        nafath_status = null,
        nafath_verified_at = null,
        signed_ip = null,
        signed_user_agent = null,
        reject_resend_count = 0
    where contract_id = p_contract_id;
  end if;

  update public.contracts
  set status = 'pending',
      sent_at = now(),
      updated_at = now(),
      invoice_amount = v_final,
      credit_used = v_credit_to_use,
      expires_at = now() + (duration_days || ' days')::interval
  where id = p_contract_id
  returning * into v_row;

  insert into public.contract_events (contract_id, event_type, message)
  values (
    p_contract_id,
    'sent',
    case
      when v_was_resend and v_credit_to_use > 0 then format('أعاد منشئ العقد إرساله بعد تعديله لأطرافه للتوثيق من جديد (خُصم %s ريال من رصيده)', v_credit_to_use)
      when v_was_resend then 'أعاد منشئ العقد إرساله بعد تعديله لأطرافه للتوثيق من جديد'
      when v_credit_to_use > 0 then format('تم إرسال العقد لأطرافه للتوثيق (خُصم %s ريال من رصيد المنشئ)', v_credit_to_use)
      else 'تم إرسال العقد لأطرافه للتوثيق'
    end
  );

  return v_row;
end;
$$;

revoke all on function public.send_contract(uuid, numeric) from public, anon;
grant execute on function public.send_contract(uuid, numeric) to authenticated;
