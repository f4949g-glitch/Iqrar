-- نظام أدمن فرعي (sub_admin) بصلاحيات محددة قابلة للتخصيص، وتدفق موافقة على
-- أكواد الخصم التي ينشئها أدمن فرعي بلا صلاحية إنشاء مباشر.
alter table public.profiles add column admin_permissions text[] not null default '{}';
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'member', 'sub_admin'));

-- صلاحية إدارية واحدة يملكها المستخدم (أدمن كامل يملك كل شيء دومًا، أو أدمن
-- فرعي يملك الصلاحية إن كانت ضمن admin_permissions).
create or replace function private.has_permission(p_permission text)
returns boolean
language sql security invoker stable set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (role = 'admin' or (role = 'sub_admin' and p_permission = any(admin_permissions)))
  );
$$;

-- تدفق موافقة أكواد الخصم: الأدمن الكامل يُنشئ أكوادًا "approved" فورًا كسابقًا،
-- والأدمن الفرعي الذي يملك صلاحية create_discount_codes فقط (بلا
-- create_discount_codes_direct) يُنشئ كودًا "pending" غير مُفعَّل حتى يوافق
-- عليه الأدمن الكامل من قسم "الطلبات".
alter table public.discount_codes add column approval_status text not null default 'approved'
  check (approval_status in ('approved', 'pending', 'rejected'));
alter table public.discount_codes add column reviewed_by uuid references public.profiles(id);
alter table public.discount_codes add column reviewed_at timestamptz;

drop policy if exists discount_codes_select on public.discount_codes;
create policy discount_codes_select on public.discount_codes for select
  using (private.is_admin() or private.has_permission('view_reports') or created_by = (select auth.uid()));

drop policy if exists discount_codes_insert on public.discount_codes;
create policy discount_codes_insert on public.discount_codes for insert
  with check (
    created_by = (select auth.uid())
    and (
      (private.is_admin() and approval_status = 'approved')
      or (
        private.has_permission('create_discount_codes')
        and (
          (private.has_permission('create_discount_codes_direct') and approval_status = 'approved')
          or (not private.has_permission('create_discount_codes_direct') and approval_status = 'pending' and is_active = false)
        )
      )
    )
  );

-- توسيع الاطلاع على العقود وأطرافها وأكواد الشحن واستخداماتها لمن يملك صلاحية
-- view_reports (أدمن فرعي)، إلى جانب الأدمن الكامل كسابقًا.
drop policy if exists contracts_select on public.contracts;
create policy contracts_select on public.contracts for select
  using (private.is_admin() or private.has_permission('view_reports') or created_by = (select auth.uid()));

drop policy if exists contract_parties_select on public.contract_parties;
create policy contract_parties_select on public.contract_parties for select
  using (
    private.is_admin()
    or private.has_permission('view_reports')
    or exists (select 1 from public.contracts c where c.id = contract_parties.contract_id and c.created_by = (select auth.uid()))
    or user_id = (select auth.uid())
  );

drop policy if exists credit_codes_select on public.credit_codes;
create policy credit_codes_select on public.credit_codes for select
  using (private.is_admin() or private.has_permission('view_reports'));

drop policy if exists credit_code_redemptions_select on public.credit_code_redemptions;
create policy credit_code_redemptions_select on public.credit_code_redemptions for select
  using (private.is_admin() or private.has_permission('view_reports') or redeemed_by = (select auth.uid()));

drop policy if exists discount_code_uses_select on public.discount_code_uses;
create policy discount_code_uses_select on public.discount_code_uses for select
  using (private.is_admin() or private.has_permission('view_reports'));
