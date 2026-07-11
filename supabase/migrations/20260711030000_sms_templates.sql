-- قوالب رسائل SMS القابلة للتعديل من لوحة تحكم الأدمن (بدل نصوص ثابتة مكتوبة
-- داخل كود الدوال الخادمية). كل قالب له مفتاح ثابت يُستخدَم من الكود، ومتغيرات
-- بصيغة {{اسم_المتغير}} يستبدلها الكود بالقيم الفعلية عند الإرسال.
create table public.sms_templates (
  key text primary key,
  label text not null,
  description text,
  body text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.sms_templates enable row level security;

create policy sms_templates_select on public.sms_templates
  for select to authenticated
  using (private.is_admin());

create policy sms_templates_update on public.sms_templates
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

revoke all on public.sms_templates from anon;

insert into public.sms_templates (key, label, description, body) values
  ('welcome', 'ترحيب بفتح حساب', 'تُرسَل فور اكتمال تسجيل حساب جديد ذاتيًا. المتغيرات: {{name}}',
   'مرحبًا {{name}}، تم إنشاء حسابك في منصة إقرار بنجاح. يمكنك الآن إنشاء العقود وإرسالها للتوثيق.'),
  ('contract_request', 'طلب توثيق عقد أو تفويض', 'تُرسَل لكل طرف عند إرسال عقد أو تفويض جديد للتوثيق. المتغيرات: {{creator}}، {{link}}',
   'لديك طلب توثيق جديد من ({{creator}}) عبر منصة إقرار. رابط العقد: {{link}}'),
  ('completion', 'اكتمال التوثيق', 'تُرسَل لكل الأطراف عند اكتمال توقيع الجميع. المتغيرات: {{title}}، {{verification_number}}',
   'نفيدكم بأنه تم توثيق "{{title}}" بنجاح عبر منصة إقرار. رقم التوثيق: {{verification_number}}'),
  ('auto_account', 'فتح حساب تلقائي لطرف', 'تُرسَل عند إنشاء حساب تلقائي لطرف عقد لا يملك حسابًا بعد. المتغيرات: {{email}}، {{password}}',
   'تم فتح حساب تلقائي لك في منصة إقرار لمتابعة عقودك. البريد: {{email}} — كلمة المرور المؤقتة: {{password}}');
