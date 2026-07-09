-- أكواد الخصم + احتساب فاتورة العقد النهائية عند الإرسال.

create table public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_percent numeric not null check (discount_percent > 0 and discount_percent <= 100),
  max_uses integer,
  max_uses_per_user integer,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.discount_codes enable row level security;

create policy discount_codes_select on public.discount_codes
  for select using (private.is_admin());

create policy discount_codes_insert on public.discount_codes
  for insert with check (private.is_admin() and created_by = auth.uid());

create policy discount_codes_update on public.discount_codes
  for update using (private.is_admin()) with check (private.is_admin());

create policy discount_codes_delete on public.discount_codes
  for delete using (private.is_admin());

create table public.discount_code_uses (
  id uuid primary key default gen_random_uuid(),
  discount_code_id uuid not null references public.discount_codes(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  used_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.discount_code_uses enable row level security;

create policy discount_code_uses_select on public.discount_code_uses
  for select using (private.is_admin());

alter table public.contracts
  add column discount_code_id uuid references public.discount_codes(id),
  add column invoice_amount numeric;

-- يتحقق من صلاحية كود الخصم ويُرجع النسبة والمبلغ بعد الخصم دون استهلاك الكود
-- فعليًا (الاستهلاك الفعلي يتم داخل send_contract عند الإرسال الحقيقي للعقد).
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
  if not private.is_admin() then
    raise exception 'غير مصرح';
  end if;

  select * into v_pricing from public.pricing_settings where id = 1;
  v_base := greatest(p_party_count * v_pricing.price_per_party, v_pricing.minimum_invoice);

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

-- ربط كود خصم مُتحقَّق منه بعقد مسودة (يُستهلَك فعليًا لاحقًا عند send_contract).
create or replace function public.set_contract_discount_code(p_contract_id uuid, p_code text)
returns public.contracts
language plpgsql security invoker set search_path = public as $$
declare
  v_row public.contracts;
begin
  update public.contracts set discount_code_id = (select id from public.discount_codes where code = p_code), updated_at = now()
  where id = p_contract_id and status = 'draft'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'تعذّر تحديث العقد';
  end if;
  return v_row;
end;
$$;

-- تحديث send_contract: يحسب الفاتورة النهائية (مع تطبيق واستهلاك كود الخصم إن وُجد).
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
