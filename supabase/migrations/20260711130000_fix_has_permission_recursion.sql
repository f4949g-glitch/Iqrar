-- عطل حرج ثانٍ من نفس الفئة: private.has_permission() ليست SECURITY DEFINER،
-- فاستعلامها الداخلي عن profiles يخضع لسياسة profiles_select نفسها التي تستدعي
-- has_permission() ضمن شروطها — تكرار متبادل يُفشل أي قراءة لجدول profiles
-- لمستخدم غير أدمن يقرأ صفًا ليس صفّه هو. الحل: جعلها SECURITY DEFINER مثل
-- private.is_admin() تمامًا، فيتجاوز استعلامها الداخلي RLS من الأساس.
create or replace function private.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (role = 'admin' or (role = 'sub_admin' and p_permission = any(admin_permissions)))
  );
$function$;
