-- سياسة contracts_select كانت تسمح فقط لمنشئ العقد (أو الأدمن) بقراءته — أي طرف
-- آخر مدعوّ للتوقيع (وليس هو من أنشأ العقد) لا يملك حسابه صلاحية قراءة صف العقد
-- نفسه إطلاقًا، رغم أن contract_parties.user_id مربوط به بالفعل. هذا كان يكسر
-- تبويب "طلبات الموافقة" (listContractsAwaitingMySignature) بصمت لأي طرف ليس
-- منشئ العقد. نضيف هنا حق قراءة صريح لكل طرف مرتبط بحسابه.
drop policy if exists contracts_select on public.contracts;
create policy contracts_select on public.contracts
  for select using (
    private.is_admin()
    or private.has_permission('view_reports')
    or created_by = (select auth.uid())
    or exists (
      select 1 from public.contract_parties p
      where p.contract_id = contracts.id and p.user_id = (select auth.uid())
    )
  );
