-- إصلاح: service_role (المستخدَم من كل Edge Functions عبر SUPABASE_SERVICE_ROLE_KEY)
-- لم يُمنح صلاحية USAGE على مخطط private ولا أي صلاحية على جداول رموز التحقق الثلاثة
-- (registration_otps، signing_otps، password_reset_otps) منذ إنشائها، فكانت كل عمليات
-- upsert عليها من دوال request-*-otp تفشل بخطأ صلاحيات (500) قبل الوصول لإرسال SMS أصلًا.
grant usage on schema private to service_role;
grant select, insert, update, delete on
  private.registration_otps,
  private.signing_otps,
  private.password_reset_otps
to service_role;
