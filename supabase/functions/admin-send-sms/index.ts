import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendSms, isSmsConfigured } from '../_shared/sms.ts';

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// صيغة دولية بدون "+": 966 ثم 9 أرقام تبدأ بـ5 (مثال: 966501234567).
const PHONE_RE = /^9665\d{8}$/;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // إرسال SMS يدوي عملية حسّاسة (تكلفة فعلية لكل رسالة)، لذا يُتحقق من أن طالب
  // الإرسال أدمن كامل عبر رمز الدخول المُرسَل، بدل الوثوق بأي قيمة من العميل.
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'يلزم تسجيل الدخول' }, 401);
  const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: callerData } = await callerClient.auth.getUser();
  if (!callerData.user) return jsonResponse({ error: 'يلزم تسجيل الدخول' }, 401);

  const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', callerData.user.id).maybeSingle();
  if (callerProfile?.role !== 'admin') return jsonResponse({ error: 'هذا الإجراء متاح لمدير المنصة فقط' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'بيانات غير صالحة' }, 400);
  }

  const phone = String(body.phone ?? '').trim();
  const message = String(body.message ?? '').trim();

  if (!PHONE_RE.test(phone)) return jsonResponse({ error: 'رقم جوال سعودي غير صحيح (مثال: 966501234567)' }, 400);
  if (!message) return jsonResponse({ error: 'نص الرسالة مطلوب' }, 400);
  if (message.length > 900) return jsonResponse({ error: 'نص الرسالة طويل جدًا (900 حرف كحد أقصى)' }, 400);

  const result = await sendSms(phone, message);

  const { error: logError } = await admin.from('sms_messages').insert({
    recipient_phone: phone,
    message,
    status: result.ok ? 'sent' : 'failed',
    error_detail: result.detail ?? null,
    sent_by: callerData.user.id,
  });
  if (logError) console.error('تعذّر تسجيل الرسالة في السجل', logError.message);

  if (!result.ok) return jsonResponse({ error: result.detail ?? 'تعذّر إرسال الرسالة', sms_configured: isSmsConfigured() }, 502);

  return jsonResponse({ ok: true, sms_configured: true });
});
