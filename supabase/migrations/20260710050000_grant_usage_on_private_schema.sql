-- إصلاح: مخطط private لم يُمنح صلاحية USAGE لأدوار anon/authenticated منذ إنشائه،
-- مما كان يفشل أي استعلام يعتمد على سياسة RLS تستدعي private.is_admin() لمستخدمي
-- الواجهة الفعليين (رغم نجاح الاختبار المباشر عبر SQL لأنه يتجاوز الأدوار والصلاحيات).
grant usage on schema private to authenticated, anon;
