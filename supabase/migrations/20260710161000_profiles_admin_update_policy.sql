-- يحتاج الأدمن الكامل لتعديل صلاحيات (admin_permissions) وأدوار مستخدمين آخرين
-- (تحويل حساب إلى أدمن فرعي)، وهو ما لا تسمح به سياسة profiles_update_self
-- الحالية (تقتصر على تعديل المستخدم لبياناته هو فقط).
create policy profiles_update_admin on public.profiles for update
  using (private.is_admin())
  with check (private.is_admin());
