-- إصلاح خلل: أكواد الخصم لا تُطبَّق فعليًا رغم ظهور معاينة صحيحة. السبب:
-- set_contract_discount_code كانت SECURITY INVOKER (تعمل بصلاحيات المستخدم
-- المستدعي)، وسياسة SELECT على discount_codes لا تسمح لمستخدم عادي برؤية كود
-- خصم أنشأه أدمن آخر — فيُعيد `select id from discount_codes where code = ...`
-- الداخلي NULL بصمت، فيُخزَّن discount_code_id = NULL رغم أن preview_discount_code
-- (SECURITY DEFINER أصلًا) كانت تعرض معاينة خصم صحيحة تمامًا للمستخدم قبلها.
create or replace function public.set_contract_discount_code(p_contract_id uuid, p_code text)
returns public.contracts
language plpgsql security definer set search_path = public
as $$
declare
  v_row public.contracts;
begin
  update public.contracts set discount_code_id = (select id from public.discount_codes where code = p_code), updated_at = now()
  where id = p_contract_id and status = 'draft' and created_by = auth.uid()
  returning * into v_row;

  if v_row.id is null then
    raise exception 'تعذّر تحديث العقد';
  end if;
  return v_row;
end;
$$;

revoke all on function public.set_contract_discount_code(uuid, text) from public, anon;
grant execute on function public.set_contract_discount_code(uuid, text) to authenticated;
