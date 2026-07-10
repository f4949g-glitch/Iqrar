-- رموز استعادة كلمة المرور عبر SMS للجوال المسجَّل في الحساب (تسجيل الدخول أصبح
-- برقم الهوية فقط). جدول داخلي غير مُتاح عبر REST، تصل إليه Edge Functions فقط
-- عبر service_role.
create table private.password_reset_otps (
  national_id text primary key,
  code text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table private.password_reset_otps enable row level security;
revoke all on private.password_reset_otps from anon, authenticated;
