-- عند السماح بتعديل العقود المرفوضة/المنتهية (20260715120000) عُدِّلت سياسات
-- contracts/contract_parties فقط، ونُسيت سياسات contract_fields (insert/update/
-- delete) التي بقيت مقصورة على status='draft' — فأي تعديل على حقول عقد مرفوض
-- (تغيير موضع/قيمة حقل، أو حذف/إضافة حقل عبر خطوة وضع الحقول) يفشل بخطأ RLS
-- خام يُترجَم إلى "ليست لديك صلاحية كافية لتنفيذ هذا الإجراء"، فيمنع المستخدم
-- من إكمال التعديل ثم إعادة الإرسال رغم أن الواجهة تسمح له بالدخول للتعديل.
-- كما أن حالة "منتهي الصلاحية" لم تُضَف قط لأي من السياسات الثلاث رغم أن
-- الواجهة تسمح بتعديل العقود المنتهية أيضًا (20260715120000 وما تلاها).

drop policy if exists contract_fields_insert on public.contract_fields;
create policy contract_fields_insert on public.contract_fields
for insert
with check (
  exists (
    select 1 from public.contracts c
    where c.id = contract_fields.contract_id
      and c.created_by = (select auth.uid())
      and c.status = any (array['draft', 'rejected', 'expired'])
  )
);

drop policy if exists contract_fields_update_creator on public.contract_fields;
create policy contract_fields_update_creator on public.contract_fields
for update
using (
  exists (
    select 1 from public.contracts c
    where c.id = contract_fields.contract_id
      and c.created_by = (select auth.uid())
      and c.status = any (array['draft', 'rejected', 'expired'])
  )
)
with check (
  exists (
    select 1 from public.contracts c
    where c.id = contract_fields.contract_id
      and c.created_by = (select auth.uid())
      and c.status = any (array['draft', 'rejected', 'expired'])
  )
);

drop policy if exists contract_fields_delete on public.contract_fields;
create policy contract_fields_delete on public.contract_fields
for delete
using (
  exists (
    select 1 from public.contracts c
    where c.id = contract_fields.contract_id
      and c.created_by = (select auth.uid())
      and c.status = any (array['draft', 'rejected', 'expired'])
  )
);

drop policy if exists contracts_update on public.contracts;
create policy contracts_update on public.contracts
for update
using (
  private.is_admin()
  or (created_by = (select auth.uid()) and status = any (array['draft', 'rejected', 'expired']))
)
with check (
  private.is_admin()
  or (created_by = (select auth.uid()) and status = any (array['draft', 'pending', 'partially_completed', 'rejected', 'expired']))
);

drop policy if exists contract_parties_update on public.contract_parties;
create policy contract_parties_update on public.contract_parties
for update
using (
  private.is_admin()
  or exists (
    select 1 from public.contracts c
    where c.id = contract_parties.contract_id
      and c.created_by = (select auth.uid())
      and c.status = any (array['draft', 'rejected', 'expired'])
  )
)
with check (
  private.is_admin()
  or exists (
    select 1 from public.contracts c
    where c.id = contract_parties.contract_id
      and c.created_by = (select auth.uid())
      and c.status = any (array['draft', 'rejected', 'expired'])
  )
);
