-- كان الطرف المشارك (غير منشئ العقد) يرى صفّه هو فقط في contract_parties
-- (شرط user_id = auth.uid())، فتظهر له صفحة تفاصيل العقد/التفويض وكأن العقد
-- بطرف واحد: عدد أطراف خاطئ (1/1) وقائمة أطراف ناقصة، وسجل الأحداث فارغ تمامًا
-- لأن contract_events_select لم تكن تسمح إلا للمنشئ والأدمن. المطلوب: جميع
-- المشاركين في العقد أو التفويض يرون عدد الأطراف وبياناتهم كاملة.
--
-- نعتمد على الدالة private.user_is_contract_party (SECURITY DEFINER) الموجودة
-- أصلًا لكسر تكرار RLS المتبادل بين contracts وcontract_parties — استخدامها هنا
-- داخل سياسة contract_parties نفسها آمن للسبب ذاته (تتجاوز RLS داخليًا).

drop policy if exists contract_parties_select on public.contract_parties;
create policy contract_parties_select on public.contract_parties for select
  using (
    private.is_admin()
    or private.has_permission('view_reports')
    or exists (select 1 from public.contracts c where c.id = contract_parties.contract_id and c.created_by = (select auth.uid()))
    or user_id = (select auth.uid())
    or private.user_is_contract_party(contract_parties.contract_id, (select auth.uid()))
  );

-- سجل أحداث العقد (أرسل/شاهد/وقّع/اكتمل...) جزء من شفافية التوثيق لكل الأطراف،
-- لا للمنشئ وحده.
drop policy if exists contract_events_select on public.contract_events;
create policy contract_events_select on public.contract_events for select
  using (
    private.is_admin()
    or exists (select 1 from public.contracts c where c.id = contract_events.contract_id and c.created_by = (select auth.uid()))
    or private.user_is_contract_party(contract_events.contract_id, (select auth.uid()))
  );

-- حقول العقد (التوقيعات والقيم المعبّأة) تظهر في المستند النهائي لكل الأطراف
-- أصلًا؛ كان الطرف يرى حقوله هو فقط فتظهر توقيعات بقية الأطراف مفقودة في
-- صفحة التفاصيل.
drop policy if exists contract_fields_select on public.contract_fields;
create policy contract_fields_select on public.contract_fields for select
  using (
    private.is_admin()
    or exists (select 1 from public.contracts c where c.id = contract_fields.contract_id and c.created_by = (select auth.uid()))
    or private.user_is_contract_party(contract_fields.contract_id, (select auth.uid()))
  );
