-- طابع زمني لآخر مرة اطّلع فيها المستخدم على إشعاراته (العقود المرسلة التي
-- تمّت الموافقة عليها بالكامل) — يُستخدم لحساب عدد الإشعارات غير المقروءة.
alter table public.profiles
  add column notifications_seen_at timestamptz;
