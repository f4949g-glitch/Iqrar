create table public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  document_type text not null default 'contract' check (document_type in ('contract','power_of_attorney')),
  body_json jsonb not null,
  party_count int not null check (party_count between 1 and 10),
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contract_template_access (
  template_id uuid not null references public.contract_templates(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  granted_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (template_id, user_id)
);

alter table public.contract_templates enable row level security;
alter table public.contract_template_access enable row level security;

-- نفس نمط الدالة الآمنة من التكرار في 20260711120000_fix_contracts_select_recursion.sql
create or replace function private.user_has_template_access(p_template_id uuid, p_user_id uuid)
returns boolean language sql security definer stable set search_path to 'public'
as $function$
  select exists (select 1 from public.contract_template_access where template_id = p_template_id and user_id = p_user_id);
$function$;

create policy contract_templates_select on public.contract_templates
  for select using (
    private.is_admin()
    or private.has_permission('manage_contract_templates')
    or (is_active and private.user_has_template_access(id, (select auth.uid())))
  );
create policy contract_templates_write on public.contract_templates
  for all using (private.is_admin() or private.has_permission('manage_contract_templates'))
  with check (private.is_admin() or private.has_permission('manage_contract_templates'));

create policy contract_template_access_select on public.contract_template_access
  for select using (private.is_admin() or private.has_permission('manage_contract_templates') or user_id = (select auth.uid()));
create policy contract_template_access_write on public.contract_template_access
  for all using (private.is_admin() or private.has_permission('manage_contract_templates'))
  with check (private.is_admin() or private.has_permission('manage_contract_templates'));
