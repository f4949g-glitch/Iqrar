import type { createClient } from 'jsr:@supabase/supabase-js@2';

type AdminClient = ReturnType<typeof createClient>;

// يجلب قالب رسالة قابلًا للتعديل من لوحة تحكم الأدمن (جدول sms_templates) ويستبدل
// متغيراته بصيغة {{اسم_المتغير}} بالقيم الفعلية. عند غياب القالب (مثلًا حذفه
// بالخطأ) يُستخدم fallback ثابت في الكود كي لا تنقطع عملية الإرسال.
export async function renderSmsTemplate(
  admin: AdminClient,
  key: string,
  vars: Record<string, string>,
  fallback: string,
): Promise<string> {
  const { data } = await admin.from('sms_templates').select('body').eq('key', key).maybeSingle();
  let body = (data?.body as string | undefined) ?? fallback;
  for (const [name, value] of Object.entries(vars)) {
    body = body.replaceAll(`{{${name}}}`, value);
  }
  return body;
}
