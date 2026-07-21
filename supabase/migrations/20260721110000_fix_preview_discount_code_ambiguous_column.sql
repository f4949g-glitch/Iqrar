-- إصلاح جذري لعطل أكواد الخصم المكتشف بإعادة الاختبار الحي: preview_discount_code كانت
-- تنهار بخطأ "column reference discount_code_id is ambiguous" لأي كود صالح، لأن اسم
-- عمود الإرجاع discount_code_id (في returns table) يتعارض مع عمود جدول
-- discount_code_uses في استعلامي عدّ الاستخدامات غير المؤهَّلين باسم الجدول.
-- المفارقة أن الأكواد غير الصالحة كانت "تعمل" (تخرج مبكرًا برسالة واضحة) بينما الصالحة
-- تنهار عند بلوغ سطر العدّ — فيظهر للمستخدم "تعذّر التحقق من الكود" ولا يُطبَّق الخصم
-- أبدًا. الإصلاح: تأهيل المرجعَين بالاسم المستعار u (نفس فئة الخلل التي أُصلحت سابقًا
-- في verify_document بترحيل fix_verify_document_ambiguous_column).
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

  select count(*) into v_uses_total from public.discount_code_uses u where u.discount_code_id = v_code.id;
  if v_code.max_uses is not null and v_uses_total >= v_code.max_uses then
    return query select null::uuid, null::numeric, v_base, v_base, 'تم استنفاد عدد مرات استخدام الكود';
    return;
  end if;

  select count(*) into v_uses_by_user from public.discount_code_uses u where u.discount_code_id = v_code.id and u.used_by = auth.uid();
  if v_code.max_uses_per_user is not null and v_uses_by_user >= v_code.max_uses_per_user then
    return query select null::uuid, null::numeric, v_base, v_base, 'استنفدت عدد مرات استخدامك المسموحة لهذا الكود';
    return;
  end if;

  return query select v_code.id, v_code.discount_percent, v_base, round(v_base * (1 - v_code.discount_percent / 100), 2), null::text;
end;
$$;

revoke all on function public.preview_discount_code(text, integer) from public;
grant execute on function public.preview_discount_code(text, integer) to authenticated;
