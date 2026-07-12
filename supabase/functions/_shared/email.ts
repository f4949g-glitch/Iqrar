export function isEmailConfigured(): boolean {
  return Boolean(Deno.env.get('RESEND_API_KEY'));
}

export interface SendEmailResult {
  ok: boolean;
  detail?: string;
}

// يرسل بريدًا عبر Resend HTTP API إن كان السرّ RESEND_API_KEY مضبوطًا، وإلا يسجّل
// تحذيرًا فقط دون كسر بقية العملية. لا يُستخدم SMTP الخام لأن Supabase Edge
// Functions (Deno Deploy) لا تسمح باتصالات Socket خام — كل أمثلة Supabase
// الرسمية لإرسال البريد من Edge Functions تستخدم حصريًا Resend عبر fetch()
// لهذا السبب بالتحديد.
// يُعيد نتيجة الإرسال (بدل إسكاتها بصمت) ليتمكن المستدعي من إخبار المستخدم عند
// فشل إرسال رمز تحقق حسّاس بدل ادّعاء نجاح الإرسال.
export async function sendEmail(to: string, subject: string, html: string): Promise<SendEmailResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('NOTIFICATIONS_FROM_EMAIL') ?? 'إقرار <onboarding@resend.dev>';

  if (!apiKey) {
    const detail = 'بوابة البريد الإلكتروني غير مُفعّلة بعد (RESEND_API_KEY غير مضبوط)';
    console.warn(`${detail} — تم تخطي إرسال البريد إلى ${to}: ${subject}`);
    return { ok: false, detail };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('فشل إرسال البريد عبر Resend', detail);
      return { ok: false, detail: detail.slice(0, 500) };
    }
    return { ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'خطأ غير معروف عند الاتصال ببوابة البريد الإلكتروني';
    console.error('فشل الاتصال بـ Resend', detail);
    return { ok: false, detail };
  }
}
