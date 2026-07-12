import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

// نفس بيانات SMTP التي أُدخلت في Supabase (Authentication > Emails > SMTP Settings)
// تُعاد إدخالها هنا كأسرار Edge Functions منفصلة (Project Settings > Edge Functions >
// Secrets) لأن دوال Edge لا يمكنها قراءة إعدادات SMTP الداخلية الخاصة بنظام Auth.
export function isEmailConfigured(): boolean {
  return Boolean(Deno.env.get('SMTP_HOST') && Deno.env.get('SMTP_USERNAME') && Deno.env.get('SMTP_PASSWORD'));
}

export interface SendEmailResult {
  ok: boolean;
  detail?: string;
}

// يرسل بريدًا عبر SMTP إن كانت أسرار SMTP_HOST/SMTP_USERNAME/SMTP_PASSWORD مضبوطة،
// وإلا يسجّل تحذيرًا فقط دون كسر بقية العملية — حتى تعمل منصة العقود كاملة (روابط
// التوقيع، الحالة، PDF النهائي) قبل ربط مزوّد بريد فعلي.
// يُعيد نتيجة الإرسال (بدل إسكاتها بصمت) ليتمكن المستدعي من إخبار المستخدم عند
// فشل إرسال رمز تحقق حسّاس بدل ادّعاء نجاح الإرسال.
export async function sendEmail(to: string, subject: string, html: string): Promise<SendEmailResult> {
  const host = Deno.env.get('SMTP_HOST');
  const username = Deno.env.get('SMTP_USERNAME');
  const password = Deno.env.get('SMTP_PASSWORD');
  const port = Number(Deno.env.get('SMTP_PORT') ?? '587');
  const from = Deno.env.get('NOTIFICATIONS_FROM_EMAIL') ?? username ?? '';

  if (!host || !username || !password) {
    const detail = 'بوابة البريد الإلكتروني غير مُفعّلة بعد (إعدادات SMTP غير مضبوطة)';
    console.warn(`${detail} — تم تخطي إرسال البريد إلى ${to}: ${subject}`);
    return { ok: false, detail };
  }

  const client = new SMTPClient({
    connection: {
      hostname: host,
      port,
      tls: port === 465,
      auth: { username, password },
    },
  });

  try {
    await client.send({
      from,
      to,
      subject,
      content: 'يرجى تفعيل عرض HTML في برنامج البريد لقراءة هذه الرسالة.',
      html,
    });
    return { ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'خطأ غير معروف عند الاتصال ببوابة البريد الإلكتروني';
    console.error('فشل إرسال البريد عبر SMTP', detail);
    return { ok: false, detail };
  } finally {
    try {
      await client.close();
    } catch {
      // تجاهل فشل إغلاق الاتصال — لا يؤثر على نتيجة الإرسال نفسها
    }
  }
}
