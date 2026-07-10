-- إصلاح: أسماء أعمدة الإخراج في verify_document (title, document_type,
-- verification_number, completed_at) تتطابق مع أسماء أعمدة public.contracts،
-- فتصبح أي إشارة غير مؤهّلة لها داخل الدالة "ambiguous" في PL/pgSQL. إصلاح بإضافة
-- alias صريح لجدول contracts وتأهيل كل إشارة.
create or replace function public.verify_document(
  p_verification_number text,
  p_national_id_1 text,
  p_national_id_2 text default null,
  p_completed_date date default null
)
returns table (
  title text,
  document_type text,
  verification_number text,
  completed_at timestamptz,
  party_full_name text,
  party_role_label text,
  party_status text,
  party_signed_at timestamptz
)
language plpgsql security definer set search_path = public as $$
declare
  v_contract public.contracts;
  v_match_1 boolean;
  v_match_2 boolean;
begin
  select c.* into v_contract from public.contracts c
  where c.verification_number = p_verification_number and c.status = 'completed';

  if v_contract.id is null then
    raise exception 'لم يتم العثور على توثيق مطابق للبيانات المدخلة';
  end if;

  if v_contract.document_type = 'power_of_attorney' then
    if p_completed_date is null or p_completed_date <> v_contract.completed_at::date then
      raise exception 'لم يتم العثور على توثيق مطابق للبيانات المدخلة';
    end if;
    select exists (
      select 1 from public.contract_parties cp where cp.contract_id = v_contract.id and cp.national_id = p_national_id_1
    ) into v_match_1;
    if not v_match_1 then
      raise exception 'لم يتم العثور على توثيق مطابق للبيانات المدخلة';
    end if;
  else
    if p_national_id_2 is null then
      raise exception 'رقما الهوية مطلوبان لهذا النوع من الوثائق';
    end if;
    select exists (
      select 1 from public.contract_parties cp where cp.contract_id = v_contract.id and cp.national_id = p_national_id_1
    ) into v_match_1;
    select exists (
      select 1 from public.contract_parties cp where cp.contract_id = v_contract.id and cp.national_id = p_national_id_2
    ) into v_match_2;
    if not v_match_1 or not v_match_2 or p_national_id_1 = p_national_id_2 then
      raise exception 'لم يتم العثور على توثيق مطابق للبيانات المدخلة';
    end if;
  end if;

  return query
    select v_contract.title, v_contract.document_type, v_contract.verification_number, v_contract.completed_at,
           cp.full_name, cp.role_label, cp.status, cp.signed_at
    from public.contract_parties cp
    where cp.contract_id = v_contract.id
    order by cp.order_index;
end;
$$;
