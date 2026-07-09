// تكامل نفاذ (منصة التحقق من الهوية الرقمية السعودية) — يتطلب اعتمادًا رسميًا من
// هيئة الحكومة الرقمية (DGA) وبيانات API فعلية (NAFATH_BASE_URL / NAFATH_API_KEY /
// NAFATH_APP_ID) تُضبط كأسرار لدوال Supabase Edge. إلى حين توفّرها تُعيد هذه الدوال
// configured:false بدل محاولة نداء وهمي، حتى لا تُقدَّم نتيجة تحقق غير حقيقية لأي طرف.

function isConfigured(): boolean {
  return Boolean(Deno.env.get('NAFATH_BASE_URL') && Deno.env.get('NAFATH_API_KEY') && Deno.env.get('NAFATH_APP_ID'));
}

export interface NafathInitResult {
  configured: boolean;
  transId?: string;
  random?: string;
  error?: string;
}

// يبدأ طلب تحقق جديد عبر نفاذ لمواطن/مقيم بمعرّف هويته الوطنية. النمط المتّبع هنا
// (transId + رمز عشوائي يظهر للمستخدم في تطبيق نفاذ ليوافق عليه) هو النمط المعروف
// عمومًا لخدمة نفاذ — يجب مطابقة مسار النداء الفعلي والحقول مع وثائق DGA عند وصولها.
export async function initiateNafathVerification(nationalId: string): Promise<NafathInitResult> {
  if (!isConfigured()) return { configured: false };

  const baseUrl = Deno.env.get('NAFATH_BASE_URL')!;
  const apiKey = Deno.env.get('NAFATH_API_KEY')!;
  const appId = Deno.env.get('NAFATH_APP_ID')!;

  const res = await fetch(`${baseUrl}/individual/${nationalId}/nafath/init`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId, service: 'iqrar-contract-verification' }),
  });

  if (!res.ok) {
    return { configured: true, error: await res.text() };
  }

  const data = await res.json();
  return { configured: true, transId: data.transId, random: data.random };
}

export interface NafathStatusResult {
  configured: boolean;
  status?: 'pending' | 'completed' | 'rejected' | 'expired';
  fullName?: string;
  error?: string;
}

export async function checkNafathStatus(nationalId: string, transId: string): Promise<NafathStatusResult> {
  if (!isConfigured()) return { configured: false };

  const baseUrl = Deno.env.get('NAFATH_BASE_URL')!;
  const apiKey = Deno.env.get('NAFATH_API_KEY')!;

  const res = await fetch(`${baseUrl}/individual/${nationalId}/nafath/status?transId=${transId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    return { configured: true, error: await res.text() };
  }

  const data = await res.json();
  return { configured: true, status: data.status, fullName: data.fullName };
}
