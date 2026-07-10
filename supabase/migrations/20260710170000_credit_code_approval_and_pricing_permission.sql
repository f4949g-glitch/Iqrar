-- إضافة نظام موافقة أكواد الشحن (مطابق تمامًا لأكواد الخصم) + صلاحية تعديل التسعير للأدمن الفرعي.

alter table public.credit_codes
  add column approval_status text not null default 'approved' check (approval_status in ('approved', 'pending', 'rejected')),
  add column reviewed_by uuid references public.profiles(id),
  add column reviewed_at timestamptz;

drop policy if exists credit_codes_insert on public.credit_codes;
create policy credit_codes_insert on public.credit_codes
  for insert
  with check (
    created_by = (select auth.uid())
    and (
      (private.is_admin() and approval_status = 'approved')
      or (
        private.has_permission('create_credit_codes')
        and (
          (private.has_permission('create_credit_codes_direct') and approval_status = 'approved')
          or (not private.has_permission('create_credit_codes_direct') and approval_status = 'pending' and is_active = false)
        )
      )
    )
  );

drop policy if exists pricing_settings_update on public.pricing_settings;
create policy pricing_settings_update on public.pricing_settings
  for update
  using (private.is_admin() or private.has_permission('manage_pricing'))
  with check (private.is_admin() or private.has_permission('manage_pricing'));
