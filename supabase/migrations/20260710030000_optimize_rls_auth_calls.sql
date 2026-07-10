-- تحسين أداء: تغليف auth.uid() بـ (select ...) في سياسات RLS كي يُقيَّم مرة واحدة
-- لكل استعلام بدل إعادة تقييمه لكل صف (توصية Supabase الرسمية لتحسين الأداء عند
-- نمو حجم البيانات). لا تغيير في السلوك/الصلاحيات، فقط في كفاءة التنفيذ.

alter policy profiles_select on public.profiles
  using ((select auth.uid()) is not null);

alter policy profiles_update_self on public.profiles
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

alter policy contracts_select on public.contracts
  using (private.is_admin() or created_by = (select auth.uid()));

alter policy contracts_insert on public.contracts
  with check ((select auth.uid()) is not null and created_by = (select auth.uid()));

alter policy contracts_update on public.contracts
  using (private.is_admin() or created_by = (select auth.uid()))
  with check (private.is_admin() or created_by = (select auth.uid()));

alter policy contracts_delete_draft on public.contracts
  using ((private.is_admin() or created_by = (select auth.uid())) and status = 'draft');

alter policy contract_parties_select on public.contract_parties
  using (
    private.is_admin()
    or exists (select 1 from public.contracts c where c.id = contract_parties.contract_id and c.created_by = (select auth.uid()))
    or user_id = (select auth.uid())
  );

alter policy contract_parties_insert on public.contract_parties
  with check (
    exists (select 1 from public.contracts c where c.id = contract_parties.contract_id and c.created_by = (select auth.uid()) and c.status = 'draft')
  );

alter policy contract_parties_update on public.contract_parties
  using (
    private.is_admin()
    or exists (select 1 from public.contracts c where c.id = contract_parties.contract_id and c.created_by = (select auth.uid()))
  )
  with check (
    private.is_admin()
    or exists (select 1 from public.contracts c where c.id = contract_parties.contract_id and c.created_by = (select auth.uid()))
  );

alter policy contract_parties_delete on public.contract_parties
  using (
    exists (select 1 from public.contracts c where c.id = contract_parties.contract_id and c.created_by = (select auth.uid()) and c.status = 'draft')
  );

alter policy pricing_settings_select on public.pricing_settings
  using ((select auth.uid()) is not null);

alter policy contract_fields_select on public.contract_fields
  using (
    private.is_admin()
    or exists (select 1 from public.contracts c where c.id = contract_fields.contract_id and c.created_by = (select auth.uid()))
    or exists (select 1 from public.contract_parties p where p.id = contract_fields.party_id and p.user_id = (select auth.uid()))
  );

alter policy contract_fields_insert on public.contract_fields
  with check (
    exists (select 1 from public.contracts c where c.id = contract_fields.contract_id and c.created_by = (select auth.uid()) and c.status = 'draft')
  );

alter policy contract_fields_update_creator on public.contract_fields
  using (
    exists (select 1 from public.contracts c where c.id = contract_fields.contract_id and c.created_by = (select auth.uid()) and c.status = 'draft')
  )
  with check (
    exists (select 1 from public.contracts c where c.id = contract_fields.contract_id and c.created_by = (select auth.uid()) and c.status = 'draft')
  );

alter policy contract_fields_delete on public.contract_fields
  using (
    exists (select 1 from public.contracts c where c.id = contract_fields.contract_id and c.created_by = (select auth.uid()) and c.status = 'draft')
  );

alter policy contract_events_select on public.contract_events
  using (
    private.is_admin()
    or exists (select 1 from public.contracts c where c.id = contract_events.contract_id and c.created_by = (select auth.uid()))
  );

alter policy contract_events_insert on public.contract_events
  with check (
    private.is_admin()
    or exists (select 1 from public.contracts c where c.id = contract_events.contract_id and c.created_by = (select auth.uid()))
  );

alter policy discount_codes_insert on public.discount_codes
  with check (private.is_admin() and created_by = (select auth.uid()));

alter policy credit_codes_insert on public.credit_codes
  with check (private.is_admin() and created_by = (select auth.uid()));

alter policy credit_code_redemptions_select on public.credit_code_redemptions
  using (private.is_admin() or redeemed_by = (select auth.uid()));
