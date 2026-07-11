-- إضافة عمود لتتبّع إيقاف حساب العميل (يُضبط عبر admin-manage-user Edge Function
-- بالتوازي مع حظر الحساب فعليًا في auth.users عبر Auth Admin API).
alter table public.profiles add column if not exists suspended_at timestamptz;
