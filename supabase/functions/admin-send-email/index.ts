import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendEmail, isEmailConfigured } from '../_shared/email.ts';

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // إرسال بريد يدوي عملية حسّاسة (تكلفة فعلية لكل رسالة وتصل باسم المنصة)، لذا
  // يُتحقق من أن طالب الإرسال أدمن كامل عبر رمز الدخول المُرسَل.
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

  const email = String(body.email ?? '').trim().toLowerCase();
  const subject = String(body.subject ?? '').trim();
  const message = String(body.message ?? '').trim();

  if (!EMAIL_RE.test(email)) return jsonResponse({ error: 'أدخل بريدًا إلكترونيًا صحيحًا' }, 400);
  if (!subject) return jsonResponse({ error: 'عنوان الرسالة مطلوب' }, 400);
  if (!message) return jsonResponse({ error: 'نص الرسالة مطلوب' }, 400);
  if (message.length > 5000) return jsonResponse({ error: 'نص الرسالة طويل جدًا (5000 حرف كحد أقصى)' }, 400);

  const html = `<div>${message
    .split('\n')
    .map((line) => `<p>${line}</p>`)
    .join('')}</div>`;
  const result = await sendEmail(email, subject, html);

  const { error: logError } = await admin.from('email_messages').insert({
    recipient_email: email,
    subject,
    message,
    status: result.ok ? 'sent' : 'failed',
    error_detail: result.detail ?? null,
    sent_by: callerData.user.id,
  });
  if (logError) console.error('تعذّر تسجيل الرسالة في السجل', logError.message);

  if (!result.ok) return jsonResponse({ error: result.detail ?? 'تعذّر إرسال الرسالة', email_configured: isEmailConfigured() }, 502);

  return jsonResponse({ ok: true, email_configured: true });
});
