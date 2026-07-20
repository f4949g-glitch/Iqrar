-- verify_document كانت تُطلق نفس رسالة الخطأ العامة "لم يتم العثور على توثيق
-- مطابق للبيانات المدخلة" في كل حالات الفشل (رقم توثيق غير موجود، تاريخ إتمام
-- لا يطابق، رقم هوية لا يطابق) دون تمييز نوع الخطأ الفعلي للمستخدم. التصحيح:
-- رسائل مميَّزة لكل حالة مع إبقاء الغموض الكافي لعدم كشف تفاصيل حساسة (لا
-- نكشف عدد/أسماء الأطراف، فقط طبيعة عدم التطابق).
create or replace function public.verify_document(p_verification_number text, p_national_id_1 text, p_national_id_2 text default null::text, p_completed_date date default null::date)
 returns table(title text, document_type text, verification_number text, completed_at timestamp with time zone, party_full_name text, party_role_label text, party_status text, party_signed_at timestamp with time zone)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_contract public.contracts;
  v_match_1 boolean;
  v_match_2 boolean;
begin
  select c.* into v_contract from public.contracts c
  where c.verification_number = p_verification_number and c.status = 'completed';

  if v_contract.id is null then
    raise exception 'رقم التوثيق المدخل غير صحيح أو غير موجود';
  end if;

  if v_contract.document_type = 'power_of_attorney' then
    if p_completed_date is null or p_completed_date <> v_contract.completed_at::date then
      raise exception 'تاريخ إتمام التوثيق المدخل لا يطابق سجلاتنا لهذا الرقم';
    end if;
    select exists (
      select 1 from public.contract_parties cp where cp.contract_id = v_contract.id and cp.national_id = p_national_id_1
    ) into v_match_1;
    if not v_match_1 then
      raise exception 'رقم الهوية المدخل لا يطابق أطراف هذا التفويض';
    end if;
  else
    if p_national_id_2 is null then
      raise exception 'رقما الهوية مطلوبان لهذا النوع من الوثائق';
    end if;
    if p_national_id_1 = p_national_id_2 then
      raise exception 'رقما الهوية المدخلان يجب أن يكونا مختلفين';
    end if;
    select exists (
      select 1 from public.contract_parties cp where cp.contract_id = v_contract.id and cp.national_id = p_national_id_1
    ) into v_match_1;
    select exists (
      select 1 from public.contract_parties cp where cp.contract_id = v_contract.id and cp.national_id = p_national_id_2
    ) into v_match_2;
    if not v_match_1 or not v_match_2 then
      raise exception 'رقما الهوية المدخلان لا يطابقان أطراف هذا العقد';
    end if;
  end if;

  return query
    select v_contract.title, v_contract.document_type, v_contract.verification_number, v_contract.completed_at,
           cp.full_name, cp.role_label, cp.status, cp.signed_at
    from public.contract_parties cp
    where cp.contract_id = v_contract.id
    order by cp.order_index;
end;
$function$
;
