-- يلزم عرض السعر التقديري للضيوف قبل تسجيل الدخول/إنشاء حساب في خطوة "عدد الأطراف
-- والسعر" الجديدة على الصفحة الرئيسية؛ التسعير معلومة عامة غير حساسة.
drop policy pricing_settings_select on public.pricing_settings;
create policy pricing_settings_select on public.pricing_settings for select using (true);
grant select on public.pricing_settings to anon;
