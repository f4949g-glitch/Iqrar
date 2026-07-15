-- ينقل العقود التي تجاوزت مدة صلاحية توثيقها (expires_at) دون اكتمال توقيع
-- كل أطرافها إلى حالة "منتهي" تلقائيًا كل 15 دقيقة — بالإضافة إلى فحص فوري
-- مستقل في get-signing-session/submit-signature يمنع التوقيع خلال الفارق
-- الزمني القصير قبل تشغيل هذه الوظيفة المجدولة التالية.
create extension if not exists pg_cron;

create or replace function private.expire_overdue_contracts()
returns void
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  update public.contracts
  set status = 'expired', updated_at = now()
  where status in ('pending', 'partially_completed')
    and expires_at is not null
    and expires_at < now();
end;
$$;

select cron.schedule('expire-overdue-contracts', '*/15 * * * *', $$select private.expire_overdue_contracts();$$);
