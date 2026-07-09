-- التحقق من هوية الأطراف عبر نفاذ (بديل عن إدخال الاسم يدويًا).

-- الاسم يُترك فارغًا عند اختيار التحقق عبر نفاذ إلى حين اكتمال التحقق وتعبئته تلقائيًا.
alter table public.contract_parties alter column full_name drop not null;

alter table public.contract_parties
  add column verification_method text not null default 'manual' check (verification_method in ('manual', 'nafath')),
  add column date_of_birth date,
  add column nafath_trans_id text,
  add column nafath_random_code text,
  add column nafath_status text check (nafath_status in ('pending', 'completed', 'rejected', 'expired')),
  add column nafath_verified_at timestamptz;

-- send_contract يتحقق الآن أيضًا أن كل طرف يملك اسمًا (يدويًا أو عبر نفاذ) قبل الإرسال.
create or replace function public.send_contract(p_contract_id uuid)
returns public.contracts
language plpgsql security invoker set search_path = public as $$
declare
  v_row public.contracts;
  v_party_count integer;
  v_unnamed_count integer;
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
  if v_row.status <> 'draft' then
    raise exception 'العقد ليس في حالة مسودة';
  end if;

  select count(*) into v_party_count from public.contract_parties where contract_id = p_contract_id;
  if v_party_count = 0 then
    raise exception 'أضف طرفًا واحدًا على الأقل قبل الإرسال';
  end if;

  select count(*) into v_unnamed_count from public.contract_parties
  where contract_id = p_contract_id and (full_name is null or trim(full_name) = '');
  if v_unnamed_count > 0 then
    raise exception 'أكمل التحقق عبر نفاذ (أو أدخل الاسم يدويًا) لجميع الأطراف قبل الإرسال';
  end if;

  select * into v_pricing from public.pricing_settings where id = 1;
  v_base := greatest(v_party_count * v_pricing.price_per_party, v_pricing.minimum_invoice);
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

    v_final := round(v_base * (1 - v_code.discount_percent / 100), 2);
    insert into public.discount_code_uses (discount_code_id, contract_id, used_by) values (v_code.id, p_contract_id, auth.uid());
  end if;

  update public.contracts
  set status = 'pending',
      sent_at = now(),
      updated_at = now(),
      invoice_amount = v_final,
      expires_at = case when duration_days is not null then now() + (duration_days || ' days')::interval else null end
  where id = p_contract_id
  returning * into v_row;

  insert into public.contract_events (contract_id, event_type, message)
  values (p_contract_id, 'sent', 'تم إرسال العقد لأطرافه للتوثيق');

  return v_row;
end;
$$;
