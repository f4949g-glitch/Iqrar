-- مدة سريان العقد نفسه (اختيارية) — مستقلة عن صلاحية رابط التوثيق (duration_days).
-- إما مدة نسبية (قيمة + وحدة: يوم/أسبوع/شهر/سنة) أو تاريخ انتهاء محدد، أو لا شيء.
alter table public.contracts
  add column term_value integer,
  add column term_unit text check (term_unit in ('day', 'week', 'month', 'year')),
  add column term_end_date date;
