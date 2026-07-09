-- يسمح الآن بتسجيل عام للزوار (منصة متعددة المستخدمين)، وليس فقط حسابات داخلية.
-- نضيف حقول الهوية المطلوبة في نموذج التسجيل المرجعي (الاسم/رقم الهوية/الجنسية/
-- تاريخ الميلاد/الجوال)، مع فهرس فريد جزئي على رقم الهوية (يسمح بتعدد NULL).
alter table public.profiles
  add column national_id text,
  add column nationality text,
  add column date_of_birth date,
  add column phone text;

create unique index profiles_national_id_key on public.profiles (national_id) where national_id is not null;

-- بحث البريد المرتبط برقم هوية لتسجيل الدخول به (يطابق نمط login_email_for_national_id
-- في مشروع "مورس" الشقيق)، بصلاحية SECURITY DEFINER كي يعمل قبل أي مصادقة (anon).
create function public.login_email_for_national_id(p_national_id text)
returns text
language sql stable security definer set search_path = public as $$
  select email from public.profiles where national_id = p_national_id
$$;
revoke all on function public.login_email_for_national_id(text) from public;
grant execute on function public.login_email_for_national_id(text) to anon, authenticated;
