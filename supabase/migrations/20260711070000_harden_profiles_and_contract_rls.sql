-- الثغرة 1: أي مستخدم مسجَّل دخول كان يستطيع قراءة كل بيانات كل المستخدمين
-- الآخرين (رقم الهوية، الجوال، البريد، وصورة التوقيع المحفوظة) لأن profiles_select
-- كانت تسمح لأي مستخدم موثَّق بقراءة كل الصفوف. نقيّدها الآن إلى: نفسه، أو أدمن
-- كامل، أو أدمن فرعي لديه صلاحية view_reports (تحتاجها صفحة التقارير فعليًا).
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    id = (select auth.uid())
    or private.is_admin()
    or private.has_permission('view_reports')
  );

-- الثغرة 2: صلاحيات تعديل contracts/contract_parties لم تكن مقيَّدة بحالة "مسودة"،
-- فكان بإمكان منشئ العقد تعديل عقد بعد إرساله أو حتى بعد اكتماله (عبر استدعاء
-- مباشر لقاعدة البيانات متجاوزًا واجهة التطبيق) وتلفيق حالة "مكتمل" وبيانات
-- توقيع وهمية. الإكمال الفعلي دائمًا يتم عبر submit-signature بصلاحية service_role
-- التي تتجاوز RLS أصلًا، فتقييد صلاحية المنشئ هنا لا يكسر أي تدفق شرعي.
drop policy if exists contracts_update on public.contracts;
create policy contracts_update on public.contracts
  for update
  using (private.is_admin() or (created_by = (select auth.uid()) and status = 'draft'))
  with check (private.is_admin() or (created_by = (select auth.uid()) and status in ('draft', 'pending')));

drop policy if exists contract_parties_update on public.contract_parties;
create policy contract_parties_update on public.contract_parties
  for update
  using (
    private.is_admin()
    or exists (
      select 1 from public.contracts c
      where c.id = contract_parties.contract_id and c.created_by = (select auth.uid()) and c.status = 'draft'
    )
  )
  with check (
    private.is_admin()
    or exists (
      select 1 from public.contracts c
      where c.id = contract_parties.contract_id and c.created_by = (select auth.uid()) and c.status = 'draft'
    )
  );
