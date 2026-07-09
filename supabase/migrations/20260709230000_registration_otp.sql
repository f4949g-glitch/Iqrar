-- رموز تحقق SMS لإنشاء الحساب العام (التسجيل يتم عبر SMS، بخلاف توثيق أطراف العقود
-- الذي يبقى عبر نفاذ). جدول داخلي غير مُتاح عبر REST (RLS بلا سياسات + دون منح صلاحيات).
create table private.registration_otps (
  phone text primary key,
  code text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table private.registration_otps enable row level security;
revoke all on private.registration_otps from anon, authenticated;
