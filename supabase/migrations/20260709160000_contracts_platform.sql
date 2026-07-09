-- إعادة بناء المخطط لمنصة "توثيق العقود" (تحل محل مخطط "إقرار" البسيط الأولي).

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists private.handle_new_admin();
drop function if exists public.admin_count();
drop function if exists public.create_declaration(text, text);
drop function if exists public.get_declaration_by_token(text);
drop function if exists public.sign_declaration(text, text);
drop table if exists public.declarations;
drop table if exists public.declaration_settings;
drop table if exists public.admins;
drop function if exists private.is_admin();

create extension if not exists pgcrypto;
create schema if not exists private;

-- ============================================================
-- profiles: مستخدمو المنصة الداخليون (منشئو العقود / المدراء). RBAC بسيط الآن.
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'member' check (role in ('admin', 'member')),
  must_change_password boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy profiles_select on public.profiles
  for select using (auth.uid() is not null);

create policy profiles_update_self on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function private.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- أول مستخدم Auth يُسجَّل تلقائيًا admin، وأي حساب لاحق (يُنشأ لاحقًا عبر Edge Function
-- بصلاحية service_role لأطراف العقود) يُسجَّل member. لا صفحة تسجيل عامة في الواجهة.
create or replace function private.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case when exists (select 1 from public.profiles) then 'member' else 'admin' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ============================================================
-- contracts
-- ============================================================
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'partially_completed', 'completed', 'expired', 'rejected', 'cancelled')),
  source_type text not null default 'pdf' check (source_type in ('pdf', 'editor', 'docx')),
  original_file_path text,
  final_file_path text,
  page_count integer not null default 1,
  duration_days integer,
  expires_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  completed_at timestamptz
);

create index contracts_created_by_idx on public.contracts (created_by);
create index contracts_status_idx on public.contracts (status);

alter table public.contracts enable row level security;

create policy contracts_select on public.contracts
  for select using (private.is_admin() or created_by = auth.uid());

create policy contracts_insert on public.contracts
  for insert with check (auth.uid() is not null and created_by = auth.uid());

create policy contracts_update on public.contracts
  for update using (private.is_admin() or created_by = auth.uid())
  with check (private.is_admin() or created_by = auth.uid());

create policy contracts_delete_draft on public.contracts
  for delete using ((private.is_admin() or created_by = auth.uid()) and status = 'draft');

-- ============================================================
-- contract_parties
-- ============================================================
create table public.contract_parties (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  role_label text not null,
  full_name text not null,
  national_id text,
  email text,
  phone text,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  status text not null default 'pending' check (status in ('pending', 'viewed', 'signed', 'rejected')),
  order_index integer not null default 0,
  user_id uuid references auth.users(id),
  signed_at timestamptz,
  created_at timestamptz not null default now()
);

create index contract_parties_contract_idx on public.contract_parties (contract_id);
create index contract_parties_token_idx on public.contract_parties (token);
create index contract_parties_user_idx on public.contract_parties (user_id);

alter table public.contract_parties enable row level security;

create policy contract_parties_select on public.contract_parties
  for select using (
    private.is_admin()
    or exists (select 1 from public.contracts c where c.id = contract_id and c.created_by = auth.uid())
    or user_id = auth.uid()
  );

create policy contract_parties_insert on public.contract_parties
  for insert with check (
    exists (select 1 from public.contracts c where c.id = contract_id and c.created_by = auth.uid() and c.status = 'draft')
  );

create policy contract_parties_update on public.contract_parties
  for update using (
    private.is_admin() or exists (select 1 from public.contracts c where c.id = contract_id and c.created_by = auth.uid())
  )
  with check (
    private.is_admin() or exists (select 1 from public.contracts c where c.id = contract_id and c.created_by = auth.uid())
  );

create policy contract_parties_delete on public.contract_parties
  for delete using (
    exists (select 1 from public.contracts c where c.id = contract_id and c.created_by = auth.uid() and c.status = 'draft')
  );

-- ============================================================
-- contract_fields
-- ============================================================
create table public.contract_fields (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  party_id uuid not null references public.contract_parties(id) on delete cascade,
  field_type text not null check (field_type in
    ('text', 'number', 'email', 'phone', 'date', 'time', 'signature', 'image', 'logo', 'stamp', 'checkbox', 'select', 'textarea', 'file')),
  label text not null,
  page_number integer not null default 1,
  pos_x numeric not null,
  pos_y numeric not null,
  width numeric not null,
  height numeric not null,
  required boolean not null default true,
  options jsonb,
  value jsonb,
  filled_at timestamptz,
  created_at timestamptz not null default now()
);

create index contract_fields_contract_idx on public.contract_fields (contract_id);
create index contract_fields_party_idx on public.contract_fields (party_id);

alter table public.contract_fields enable row level security;

create policy contract_fields_select on public.contract_fields
  for select using (
    private.is_admin()
    or exists (select 1 from public.contracts c where c.id = contract_id and c.created_by = auth.uid())
    or exists (select 1 from public.contract_parties p where p.id = party_id and p.user_id = auth.uid())
  );

create policy contract_fields_insert on public.contract_fields
  for insert with check (
    exists (select 1 from public.contracts c where c.id = contract_id and c.created_by = auth.uid() and c.status = 'draft')
  );

create policy contract_fields_update_creator on public.contract_fields
  for update using (
    exists (select 1 from public.contracts c where c.id = contract_id and c.created_by = auth.uid() and c.status = 'draft')
  )
  with check (
    exists (select 1 from public.contracts c where c.id = contract_id and c.created_by = auth.uid() and c.status = 'draft')
  );

create policy contract_fields_delete on public.contract_fields
  for delete using (
    exists (select 1 from public.contracts c where c.id = contract_id and c.created_by = auth.uid() and c.status = 'draft')
  );

-- ============================================================
-- contract_events: سجل الأحداث/التدقيق لكل عقد.
-- ============================================================
create table public.contract_events (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  party_id uuid references public.contract_parties(id) on delete set null,
  event_type text not null,
  message text,
  created_at timestamptz not null default now()
);

create index contract_events_contract_idx on public.contract_events (contract_id, created_at desc);

alter table public.contract_events enable row level security;

create policy contract_events_select on public.contract_events
  for select using (
    private.is_admin() or exists (select 1 from public.contracts c where c.id = contract_id and c.created_by = auth.uid())
  );

-- ============================================================
-- pricing_settings: صف واحد لسعر الطرف والحد الأدنى للفاتورة.
-- ============================================================
create table public.pricing_settings (
  id smallint primary key default 1 check (id = 1),
  price_per_party numeric not null default 0,
  minimum_invoice numeric not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.pricing_settings (id) values (1);

alter table public.pricing_settings enable row level security;

create policy pricing_settings_select on public.pricing_settings
  for select using (auth.uid() is not null);

create policy pricing_settings_update on public.pricing_settings
  for update using (private.is_admin()) with check (private.is_admin());

-- ============================================================
-- RPC: إرسال العقد للتوثيق (يتحقق من الاكتمال ويغيّر الحالة، الإشعارات تُرسَل من
-- Edge Function منفصلة بعد نجاح هذا الاستدعاء).
-- ============================================================
create or replace function public.send_contract(p_contract_id uuid)
returns public.contracts
language plpgsql security invoker set search_path = public as $$
declare
  v_row public.contracts;
  v_party_count integer;
begin
  select * into v_row from public.contracts where id = p_contract_id;
  if v_row.id is null then
    raise exception 'العقد غير موجود';
  end if;
  if v_row.status <> 'draft' then
    raise exception 'العقد ليس في حالة مسودة';
  end if;

  select count(*) into v_party_count from public.contract_parties where contract_id = p_contract_id;
  if v_party_count = 0 then
    raise exception 'أضف طرفًا واحدًا على الأقل قبل الإرسال';
  end if;

  update public.contracts
  set status = 'pending',
      sent_at = now(),
      updated_at = now(),
      expires_at = case when duration_days is not null then now() + (duration_days || ' days')::interval else null end
  where id = p_contract_id
  returning * into v_row;

  insert into public.contract_events (contract_id, event_type, message)
  values (p_contract_id, 'sent', 'تم إرسال العقد لأطرافه للتوثيق');

  return v_row;
end;
$$;
