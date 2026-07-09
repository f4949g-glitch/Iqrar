-- رصيد اشتراك لكل مستخدم يُشحن بأكواد ينشئها الأدمن، ويُخصم منه تكلفة إرسال العقد
-- (يعمل كآلية دفع فعلية داخلية بديلة عن بوابة دفع خارجية لم تُربط بعد). الأدمن معفى
-- من فحص/خصم الرصيد لأنه هو من يُصدر أكواد الشحن للآخرين أصلًا.
alter table public.profiles add column credit_balance numeric not null default 0;

create table public.credit_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  amount numeric not null check (amount > 0),
  max_uses integer,
  uses_count integer not null default 0,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.credit_codes enable row level security;

create policy credit_codes_select on public.credit_codes
  for select using (private.is_admin());
create policy credit_codes_insert on public.credit_codes
  for insert with check (private.is_admin() and created_by = auth.uid());
create policy credit_codes_update on public.credit_codes
  for update using (private.is_admin()) with check (private.is_admin());
create policy credit_codes_delete on public.credit_codes
  for delete using (private.is_admin());

create table public.credit_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  credit_code_id uuid not null references public.credit_codes(id) on delete cascade,
  redeemed_by uuid not null references auth.users(id),
  amount numeric not null,
  created_at timestamptz not null default now()
);
alter table public.credit_code_redemptions enable row level security;
create policy credit_code_redemptions_select on public.credit_code_redemptions
  for select using (private.is_admin() or redeemed_by = auth.uid());

-- يشحن رصيد المستخدم الحالي بكود صالح (كل كود يُستخدم مرة واحدة لكل مستخدم).
create or replace function public.redeem_credit_code(p_code text)
returns numeric
language plpgsql security definer set search_path = public as $$
declare
  v_code public.credit_codes;
  v_new_balance numeric;
begin
  if auth.uid() is null then
    raise exception 'يلزم تسجيل الدخول';
  end if;

  select * into v_code from public.credit_codes where code = p_code for update;
  if v_code.id is null then
    raise exception 'كود الشحن غير موجود';
  end if;
  if not v_code.is_active then
    raise exception 'كود الشحن غير مُفعَّل';
  end if;
  if v_code.max_uses is not null and v_code.uses_count >= v_code.max_uses then
    raise exception 'تم استنفاد عدد مرات استخدام هذا الكود';
  end if;
  if exists (select 1 from public.credit_code_redemptions where credit_code_id = v_code.id and redeemed_by = auth.uid()) then
    raise exception 'سبق أن استخدمت هذا الكود';
  end if;

  update public.credit_codes set uses_count = uses_count + 1 where id = v_code.id;
  insert into public.credit_code_redemptions (credit_code_id, redeemed_by, amount) values (v_code.id, auth.uid(), v_code.amount);
  update public.profiles set credit_balance = credit_balance + v_code.amount where id = auth.uid()
  returning credit_balance into v_new_balance;

  return v_new_balance;
end;
$$;
revoke all on function public.redeem_credit_code(text) from public;
grant execute on function public.redeem_credit_code(text) to authenticated;

-- إتاحة معاينة/استخدام كود الخصم لأي مستخدم مسجّل (ليس الأدمن فقط) بعد أن أصبحت
-- المنصة عامة متعددة المستخدمين، وتحديث حساب الفاتورة للنموذج الجديد (أساسي + رسم
-- لكل طرف زائد عن اثنين + ضريبة).
create or replace function public.preview_discount_code(p_code text, p_party_count integer)
returns table (discount_code_id uuid, discount_percent numeric, base_amount numeric, final_amount numeric, message text)
language plpgsql security definer set search_path = public as $$
declare
  v_code public.discount_codes;
  v_pricing public.pricing_settings;
  v_base numeric;
  v_uses_total integer;
  v_uses_by_user integer;
begin
  if auth.uid() is null then
    raise exception 'يلزم تسجيل الدخول';
  end if;

  select * into v_pricing from public.pricing_settings where id = 1;
  v_base := greatest(v_pricing.base_amount + greatest(p_party_count - 2, 0) * v_pricing.extra_party_fee, v_pricing.minimum_invoice);
  v_base := round(v_base * (1 + v_pricing.tax_percent / 100), 2);

  select * into v_code from public.discount_codes where code = p_code;
  if v_code.id is null then
    return query select null::uuid, null::numeric, v_base, v_base, 'كود الخصم غير موجود';
    return;
  end if;
  if not v_code.is_active then
    return query select null::uuid, null::numeric, v_base, v_base, 'كود الخصم غير مُفعَّل';
    return;
  end if;
  if v_code.starts_at is not null and now() < v_code.starts_at then
    return query select null::uuid, null::numeric, v_base, v_base, 'كود الخصم لم يبدأ بعد';
    return;
  end if;
  if v_code.ends_at is not null and now() > v_code.ends_at then
    return query select null::uuid, null::numeric, v_base, v_base, 'انتهت صلاحية كود الخصم';
    return;
  end if;

  select count(*) into v_uses_total from public.discount_code_uses where discount_code_id = v_code.id;
  if v_code.max_uses is not null and v_uses_total >= v_code.max_uses then
    return query select null::uuid, null::numeric, v_base, v_base, 'تم استنفاد عدد مرات استخدام الكود';
    return;
  end if;

  select count(*) into v_uses_by_user from public.discount_code_uses where discount_code_id = v_code.id and used_by = auth.uid();
  if v_code.max_uses_per_user is not null and v_uses_by_user >= v_code.max_uses_per_user then
    return query select null::uuid, null::numeric, v_base, v_base, 'استنفدت عدد مرات استخدامك المسموحة لهذا الكود';
    return;
  end if;

  return query select v_code.id, v_code.discount_percent, v_base, round(v_base * (1 - v_code.discount_percent / 100), 2), null::text;
end;
$$;
revoke all on function public.preview_discount_code(text, integer) from public;
grant execute on function public.preview_discount_code(text, integer) to authenticated;

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
      expires_at = case when duration_days is not null then now() + (duration_days || ' days')::interval else null end
  where id = p_contract_id
  returning * into v_row;

  insert into public.contract_events (contract_id, event_type, message)
  values (p_contract_id, 'sent', 'تم إرسال العقد لأطرافه للتوثيق');

  return v_row;
end;
$$;
