-- يسمح لمنشئ العقد بتعديل بيانات العقد وأطرافه (من لم يوقّع بعد) بعد رفض
-- أحد الأطراف، لا أثناء المسودة فقط — كي يتمكن من تصحيح سبب الرفض ثم إعادة
-- إرسال رابط التوقيع (زر "إعادة إرسال الرابط" الموجود أصلًا يُعيد حالة العقد
-- نفسها إلى "بانتظار التوقيع").
drop policy if exists contracts_update on public.contracts;
create policy contracts_update on public.contracts
for update
using (
  private.is_admin()
  or (created_by = (select auth.uid()) and status = any (array['draft', 'rejected']))
)
with check (
  private.is_admin()
  or (created_by = (select auth.uid()) and status = any (array['draft', 'pending', 'partially_completed', 'rejected']))
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
      and c.status = any (array['draft', 'rejected'])
  )
)
with check (
  private.is_admin()
  or exists (
    select 1 from public.contracts c
    where c.id = contract_parties.contract_id
      and c.created_by = (select auth.uid())
      and c.status = any (array['draft', 'rejected'])
  )
);
