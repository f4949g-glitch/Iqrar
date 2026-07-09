-- نظام إقرار: جدول الإقرارات، إعدادات القالب، حسابات المدراء، ودوال RPC الآمنة.

create extension if not exists pgcrypto;
create schema if not exists private;

-- ============================================================
-- admins: كل مستخدم مصادَق يُعتبر مديرًا (نظام أحادي الدور).
-- التسجيل مغلق تلقائيًا بعد أول حساب عبر Trigger أدناه.
-- ============================================================
create table public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create policy admins_select on public.admins
  for select using (auth.uid() is not null);

create policy admins_update_self on public.admins
  for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function private.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where id = auth.uid());
$$;

-- عند إنشاء أول مستخدم Auth: يُسجَّل تلقائيًا كمدير. أي محاولة تسجيل لاحقة تُرفض
-- (نظام إقرار له مدير واحد فقط يُنشئ روابط التوقيع).
create or replace function private.handle_new_admin()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.admins) >= 1 then
    raise exception 'التسجيل مغلق: يوجد حساب مدير مسجَّل مسبقًا';
  end if;
  insert into public.admins (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_admin();

create or replace function public.admin_count()
returns integer
language sql security definer set search_path = public as $$
  select count(*)::int from public.admins;
$$;
revoke all on function public.admin_count() from public;
grant execute on function public.admin_count() to anon, authenticated;

-- ============================================================
-- declaration_settings: قالب الإقرار الثابت (صف واحد قابل للتعديل من لوحة التحكم).
-- ============================================================
create table public.declaration_settings (
  id smallint primary key default 1 check (id = 1),
  template_title text not null default 'إقرار',
  template_body text not null default 'أقرّ أنا الموقّع أدناه بصحة البيانات المذكورة، وألتزم بما ورد في هذا المستند.',
  updated_at timestamptz not null default now()
);

insert into public.declaration_settings (id) values (1);

alter table public.declaration_settings enable row level security;

create policy declaration_settings_select on public.declaration_settings
  for select using (private.is_admin());

create policy declaration_settings_update on public.declaration_settings
  for update using (private.is_admin()) with check (private.is_admin());

-- ============================================================
-- declarations: كل إقرار مُرسَل لعميل، برابط فريد (token) بلا تسجيل دخول.
-- ============================================================
create table public.declarations (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_identifier text,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  status text not null default 'pending' check (status in ('pending', 'signed')),
  template_title text not null,
  template_body text not null,
  signature_data_url text,
  signed_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index declarations_token_idx on public.declarations (token);
create index declarations_created_at_idx on public.declarations (created_at desc);

alter table public.declarations enable row level security;

create policy declarations_select on public.declarations
  for select using (private.is_admin());

create policy declarations_insert on public.declarations
  for insert with check (private.is_admin() and created_by = auth.uid());

create policy declarations_delete_pending on public.declarations
  for delete using (private.is_admin() and status = 'pending');

-- ============================================================
-- RPCs
-- ============================================================

-- ينشئ إقرارًا جديدًا بلقطة من القالب الحالي (لا يتأثر الإقرار بتعديل القالب لاحقًا).
create or replace function public.create_declaration(p_client_name text, p_client_identifier text default null)
returns public.declarations
language plpgsql security definer set search_path = public as $$
declare
  v_row public.declarations;
  v_title text;
  v_body text;
begin
  if not private.is_admin() then
    raise exception 'غير مصرح';
  end if;
  if coalesce(trim(p_client_name), '') = '' then
    raise exception 'اسم العميل مطلوب';
  end if;

  select template_title, template_body into v_title, v_body
  from public.declaration_settings where id = 1;

  insert into public.declarations (client_name, client_identifier, template_title, template_body, created_by)
  values (trim(p_client_name), nullif(trim(coalesce(p_client_identifier, '')), ''), v_title, v_body, auth.uid())
  returning * into v_row;

  return v_row;
end;
$$;
revoke all on function public.create_declaration(text, text) from public;
grant execute on function public.create_declaration(text, text) to authenticated;

-- يقرأ إقرارًا واحدًا بواسطة الرابط الفريد فقط، لصفحة التوقيع العامة (بلا تسجيل دخول).
create or replace function public.get_declaration_by_token(p_token text)
returns table (client_name text, template_title text, template_body text, status text, signed_at timestamptz)
language sql security definer set search_path = public as $$
  select client_name, template_title, template_body, status, signed_at
  from public.declarations
  where token = p_token;
$$;
revoke all on function public.get_declaration_by_token(text) from public;
grant execute on function public.get_declaration_by_token(text) to anon, authenticated;

-- يعتمد توقيع العميل على إقرار "pending" فقط، ويمنع إعادة التوقيع أو التلاعب بعد الاعتماد.
create or replace function public.sign_declaration(p_token text, p_signature text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if p_signature is null or length(p_signature) < 10 then
    raise exception 'توقيع غير صالح';
  end if;

  select id into v_id from public.declarations
  where token = p_token and status = 'pending'
  for update;

  if v_id is null then
    return false;
  end if;

  update public.declarations
  set status = 'signed', signature_data_url = p_signature, signed_at = now()
  where id = v_id;

  return true;
end;
$$;
revoke all on function public.sign_declaration(text, text) from public;
grant execute on function public.sign_declaration(text, text) to anon, authenticated;
