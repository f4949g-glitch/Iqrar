// يرسل رسالة SMS عبر بوابة "فور جوالي" (4Jawaly) إن كانت الأسرار FOURJAWALY_API_KEY
// وFOURJAWALY_API_SECRET وFOURJAWALY_SENDER مضبوطة في إعدادات المشروع
// (Edge Functions > Secrets)، وإلا يسجّل تحذيرًا فقط دون كسر بقية العملية.
// المصادقة Basic base64(API_KEY:API_SECRET) حسب توثيق 4jawaly الرسمي.
export function isSmsConfigured(): boolean {
  const apiKey = Deno.env.get('FOURJAWALY_API_KEY');
  const apiSecret = Deno.env.get('FOURJAWALY_API_SECRET');
  const sender = Deno.env.get('FOURJAWALY_SENDER');
  return Boolean(apiKey && apiSecret && sender && apiKey !== '1234');
}

// 4jawaly يتطلب صيغة دولية بدون "+" (مثال: 9665XXXXXXXX)، بينما الأرقام
// مخزَّنة محليًا بصيغة سعودية 05XXXXXXXX.
function toInternational(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('966')) return digits;
  if (digits.startsWith('0')) return `966${digits.slice(1)}`;
  return digits;
}

export interface SendSmsResult {
  ok: boolean;
  detail?: string;
}

export async function sendSms(to: string, message: string): Promise<SendSmsResult> {
  const apiKey = Deno.env.get('FOURJAWALY_API_KEY');
  const apiSecret = Deno.env.get('FOURJAWALY_API_SECRET');
  const sender = Deno.env.get('FOURJAWALY_SENDER');

  if (!isSmsConfigured()) {
    const detail = 'بوابة الرسائل غير مُفعّلة بعد (بيانات 4jawaly غير مضبوطة)';
    console.warn(`${detail} — تم تخطي إرسال SMS إلى ${to}: ${message}`);
    return { ok: false, detail };
  }

  const token = btoa(`${apiKey}:${apiSecret}`);
  try {
    const res = await fetch('https://api-sms.4jawaly.com/api/v1/account/area/sms/send', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ text: message, numbers: [toInternational(to)], sender }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('فشل إرسال الرسالة عبر فور جوالي', detail);
      return { ok: false, detail: detail.slice(0, 500) };
    }
    return { ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'خطأ غير معروف عند الاتصال ببوابة الرسائل';
    console.error('فشل الاتصال ببوابة فور جوالي', detail);
    return { ok: false, detail };
  }
}
