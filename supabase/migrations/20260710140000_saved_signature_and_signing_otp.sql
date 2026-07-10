-- توقيع محفوظ في الملف الشخصي (يُرسم أو يُرفع كصورة)، بحيث لا يُستخدم تلقائيًا في
-- التوقيع الإلكتروني إلا بعد تحقق برمز عبر الجوال يُرسل عند فتح رابط التوقيع.
alter table public.profiles add column signature_data_url text;

-- جدول داخلي غير مُتاح عبر REST، تصل إليه Edge Functions فقط عبر service_role.
create table private.signing_otps (
  party_id uuid primary key references public.contract_parties(id) on delete cascade,
  code text not null,
  attempts integer not null default 0,
  verified boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table private.signing_otps enable row level security;
revoke all on private.signing_otps from anon, authenticated;
