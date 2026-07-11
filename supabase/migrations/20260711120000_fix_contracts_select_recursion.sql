-- عطل حرج: السياسة contracts_select المُضافة سابقًا للسماح للطرف بقراءة عقده
-- تستعلم مباشرة عن contract_parties عبر EXISTS، وسياسة contract_parties_select
-- بدورها تستعلم عن contracts عبر EXISTS مماثل — تكرار متبادل (infinite recursion)
-- يفشل أي استعلام SELECT على جدول contracts فورًا. الحل: دالة SECURITY DEFINER
-- تتجاوز RLS داخليًا عند التحقق من عضوية الطرف، فتكسر حلقة التكرار.
create or replace function private.user_is_contract_party(p_contract_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path to 'public'
as $function$
  select exists (
    select 1 from public.contract_parties
    where contract_id = p_contract_id and user_id = p_user_id
  );
$function$;

drop policy if exists contracts_select on public.contracts;
create policy contracts_select on public.contracts
  for select using (
    private.is_admin()
    or private.has_permission('view_reports')
    or created_by = (select auth.uid())
    or private.user_is_contract_party(id, (select auth.uid()))
  );
