-- نوع الطرف (فرد/منشأة) وبيانات إضافية للأطراف والعقد، وتوسعة نموذج التسعير.
alter table public.contract_parties
  add column party_type text not null default 'individual' check (party_type in ('individual', 'entity')),
  add column entity_name text,
  add column entity_cr_number text,
  add column nationality text,
  add column address text;

alter table public.contracts
  add column company_name text,
  add column company_cr_number text,
  add column company_logo_path text;

-- نموذج تسعير أوضح: قيمة أساسية تغطي أول طرفين + رسم إضافي لكل طرف زائد + ضريبة اختيارية.
alter table public.pricing_settings
  add column base_amount numeric not null default 0,
  add column extra_party_fee numeric not null default 0,
  add column tax_percent numeric not null default 0;

update public.pricing_settings set base_amount = minimum_invoice, extra_party_fee = price_per_party where id = 1;
