-- إصلاحان في send_contract اكتُشفا بعد اختبار حي:
-- 1) فحص عدد أطراف التفويض كان لا يزال يمنع أي عدد غير طرف واحد
--    ("لا يمكن أن يتضمن التفويض أكثر من طرف واحد")، رغم أن التفويض أُعيد
--    تصميمه هذه الجلسة ليكون بطرفين بالضبط (الموكِّل والموكَّل له) — فكان
--    إرسال أي تفويض يفشل دائمًا. أصبح الشرط الآن مطابقًا لعقد بطرفين تمامًا.
-- 2) الدالة كانت SECURITY INVOKER فتخضع قراءة discount_codes وdiscount_code_uses
--    لسياسات RLS الخاصة بالمستخدم المستدعي، التي لا تسمح لعميل عادي برؤية كود
--    خصم أنشأه أدمن آخر — فيُقرأ v_code كصف فارغ ويُرفَض الإرسال بخطأ "كود
--    الخصم لم يعد صالحًا" رغم أن الكود صالح فعلًا وطُبِّق بنجاح في خطوة
--    المعاينة/الإرفاق السابقة (التي كانت SECURITY DEFINER أصلًا). التصحيح:
--    SECURITY DEFINER مع تحقق صريح من ملكية العقد (created_by = auth.uid())
--    يعوّض عن حماية RLS التي كانت تحصل ضمنيًا عبر سياسة SELECT/UPDATE على
--    contracts سابقًا (كانت SECURITY INVOKER تعتمد عليها).
create or replace function public.send_contract(p_contract_id uuid)
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
begin
  select * into v_row from public.contracts where id = p_contract_id;
  if v_row.id is null then
    raise exception 'العقد غير موجود';
  end if;
  if v_row.created_by <> auth.uid() then
    raise exception 'غير مصرح لك بإرسال هذا العقد';
  end if;
  if v_row.status <> 'draft' then
    raise exception 'العقد ليس في حالة مسودة';
  end if;
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
    if v_party_count <> 2 then
      raise exception 'يلزم طرفان بالضبط لإرسال التفويض: الموكِّل والموكَّل له';
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

revoke all on function public.send_contract(uuid) from public, anon;
grant execute on function public.send_contract(uuid) to authenticated;
