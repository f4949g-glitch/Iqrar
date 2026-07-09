// يرسل رسالة SMS عبر بوابة "فور جوالي" (4Jawaly) إن كانت الأسرار FOURJAWALY_API_KEY
// وFOURJAWALY_SENDER مضبوطة في إعدادات المشروع (Edge Functions > Secrets)، وإلا يسجّل
// تحذيرًا فقط دون كسر بقية العملية — القيمة الحالية "1234" مؤقتة لحين تزويدنا بالبيانات
// الفعلية للحساب بعد اختبار المنصة.
export async function sendSms(to: string, message: string): Promise<void> {
  const apiKey = Deno.env.get('FOURJAWALY_API_KEY');
  const sender = Deno.env.get('FOURJAWALY_SENDER');

  if (!apiKey || apiKey === '1234' || !sender) {
    console.warn(`FOURJAWALY_API_KEY غير مضبوط بعد (بيانات حقيقية) — تم تخطي إرسال SMS إلى ${to}: ${message}`);
    return;
  }

  const res = await fetch('https://api-eu.4jawaly.com/api/v1/account/area/sms/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [{ text: message, numbers: [to], sender }],
    }),
  });

  if (!res.ok) {
    console.error('فشل إرسال الرسالة عبر فور جوالي', await res.text());
  }
}
