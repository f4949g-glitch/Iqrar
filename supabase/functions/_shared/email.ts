// يرسل بريدًا عبر Resend إن كان المفتاح السرّي RESEND_API_KEY مضبوطًا في إعدادات
// المشروع (Edge Functions > Secrets)، وإلا يسجّل تحذيرًا فقط دون كسر بقية العملية —
// حتى تعمل منصة العقود كاملة (روابط التوقيع، الحالة، PDF النهائي) قبل ربط مزوّد بريد فعلي.
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('NOTIFICATIONS_FROM_EMAIL') ?? 'إقرار <onboarding@resend.dev>';

  if (!apiKey) {
    console.warn(`RESEND_API_KEY غير مضبوط — تم تخطي إرسال البريد إلى ${to}: ${subject}`);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    console.error('فشل إرسال البريد عبر Resend', await res.text());
  }
}
