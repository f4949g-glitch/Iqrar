-- بيانات تحقّق إضافية (أثر تدقيق) تُسجَّل تلقائيًا لحظة توقيع كل طرف: عنوان IP
-- ومعلومات المتصفح/الجهاز (User-Agent)، لتقوية الحجية القانونية للتوثيق
-- الإلكتروني إلى جانب رقم الهوية ورمز التحقق ووقت التوقيع المسجَّلين أصلًا.
alter table public.contract_parties add column signed_ip text;
alter table public.contract_parties add column signed_user_agent text;
