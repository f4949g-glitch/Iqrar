-- صفحات قانونية قابلة للتعديل من لوحة تحكم الأدمن (تبدأ بسياسة الاستخدام
-- والخصوصية، وكانت من قبل نصًا ثابتًا داخل TermsPage.tsx). التنسيق: كل قسم
-- يبدأ بسطر "## عنوان القسم" ثم نص القسم في الأسطر التالية، تُحلَّل هذه الصيغة
-- في الواجهة (parseLegalSections) بدل بناء محرر أقسام منفصل معقّد.
create table public.legal_pages (
  key text primary key,
  title text not null,
  content text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.legal_pages enable row level security;

create policy legal_pages_select on public.legal_pages
  for select
  using (true);

create policy legal_pages_update on public.legal_pages
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

revoke all on public.legal_pages from anon;
grant select on public.legal_pages to anon;

insert into public.legal_pages (key, title, content) values (
  'privacy_policy',
  'سياسة الاستخدام والخصوصية',
  $$## قبول الشروط
باستخدامك منصة إقرار فإنك توافق على هذه الشروط وسياسة الخصوصية. إذا كنت لا توافق عليها، يرجى عدم استخدام المنصة.

## طبيعة الخدمة
إقرار منصة إلكترونية لإنشاء العقود والإقرارات وتوثيقها وتوقيعها إلكترونيًا، عبر توقيع إلكتروني عادي أو تحقق من الهوية عبر منصة نفاذ الوطنية.

## التزامات المستخدم
يلتزم المستخدم بصحة البيانات التي يُدخلها، وبعدم استخدام المنصة لأي غرض مخالف للأنظمة، وبالمحافظة على سرية بيانات دخوله.

## الرسوم والدفع
تُحتسب رسوم توثيق كل عقد وفق سياسة التسعير المعلنة، وتُخصم من رصيد المستخدم في المنصة عند إرسال العقد للتوثيق.

## حفظ البيانات وخصوصيتها
تُحفظ بيانات العقود والأطراف بما يلزم لتقديم الخدمة والتحقق من صحة الوثائق لاحقًا، ولا تُشارك مع أي جهة خارجية إلا وفق ما تقتضيه الأنظمة.

## التعديلات
تحتفظ إقرار بحق تعديل هذه الشروط من وقت لآخر، ويُعد استمرار استخدامك للمنصة بعد التعديل موافقة عليه.$$
);
