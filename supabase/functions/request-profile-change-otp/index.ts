import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/email.ts';
import { sendSms, isSmsConfigured } from '../_shared/sms.ts';
import { generateOtpCode } from '../_shared/otp.ts';

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// طلب تغيير البريد الإلكتروني أو رقم الجوال في الملف الشخصي: يُرسل رمز تحقق إلى
// القيمة الحالية (القديمة) لإثبات ملكيتها قبل السماح بتغييرها — لا يُغيَّر شيء
// في هذه الخطوة، فقط إثبات الملكية (انظر confirm-profile-change للتطبيق الفعلي).
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'يلزم تسجيل الدخول' }, 401);
  const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: callerData } = await callerClient.auth.getUser();
  if (!callerData.user) return jsonResponse({ error: 'يلزم تسجيل الدخول' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'بيانات غير صالحة' }, 400);
  }

  const field = String(body.field ?? '');
  const newValueRaw = String(body.new_value ?? '').trim();
  if (field !== 'email' && field !== 'phone') return jsonResponse({ error: 'حقل غير صالح' }, 400);

  const { data: profile } = await admin.from('profiles').select('email, phone').eq('id', callerData.user.id).maybeSingle();
  if (!profile) return jsonResponse({ error: 'الملف الشخصي غير موجود' }, 404);

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  if (field === 'email') {
    const newEmail = newValueRaw.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) return jsonResponse({ error: 'أدخل بريدًا إلكترونيًا صحيحًا' }, 400);
    if (newEmail === profile.email.toLowerCase()) return jsonResponse({ error: 'هذا هو بريدك الإلكتروني الحالي بالفعل' }, 400);
    const { data: existing } = await admin.from('profiles').select('id').eq('email', newEmail).maybeSingle();
    if (existing) return jsonResponse({ error: 'هذا البريد الإلكتروني مستخدَم بالفعل' }, 409);

    const { error: upsertError } = await admin.rpc('rpc_upsert_profile_change_otp', {
      p_user_id: callerData.user.id,
      p_field: 'email',
      p_new_value: newEmail,
      p_code: code,
      p_expires_at: expiresAt,
    });
    if (upsertError) return jsonResponse({ error: 'تعذّر إنشاء رمز التحقق' }, 500);

    const emailConfigured = Boolean(Deno.env.get('RESEND_API_KEY'));
    if (emailConfigured) {
      await sendEmail(
        profile.email,
        'رمز تأكيد تغيير البريد الإلكتروني',
        `<p>طلبتَ تغيير البريد الإلكتروني لحسابك في منصة إقرار إلى: ${newEmail}</p>
         <p>رمز التأكيد: <b>${code}</b> (صالح لمدة 10 دقائق)</p>
         <p>إن لم تطلب هذا التغيير، تجاهل هذه الرسالة.</p>`,
      );
    }
    return jsonResponse({ ok: true, email_configured: emailConfigured, dev_code: emailConfigured ? undefined : code });
  }

  // field === 'phone'
  const newPhone = newValueRaw.replace(/\s|-/g, '');
  if (!/^9665\d{8}$/.test(newPhone)) return jsonResponse({ error: 'رقم جوال سعودي غير صحيح (مثال: 966501234567)' }, 400);
  if (newPhone === profile.phone) return jsonResponse({ error: 'هذا هو رقم جوالك الحالي بالفعل' }, 400);
  if (!profile.phone) return jsonResponse({ error: 'لا يوجد رقم جوال حالي في حسابك لإرسال رمز التحقق إليه، تواصل مع الإدارة' }, 400);

  const { error: upsertError } = await admin.rpc('rpc_upsert_profile_change_otp', {
    p_user_id: callerData.user.id,
    p_field: 'phone',
    p_new_value: newPhone,
    p_code: code,
    p_expires_at: expiresAt,
  });
  if (upsertError) return jsonResponse({ error: 'تعذّر إنشاء رمز التحقق' }, 500);

  const smsConfigured = isSmsConfigured();
  if (smsConfigured) {
    const sendResult = await sendSms(profile.phone, `رمز تأكيد تغيير رقم الجوال في منصة إقرار: ${code} (صالح لمدة 10 دقائق)`);
    if (!sendResult.ok) return jsonResponse({ error: 'تعذّر إرسال رمز التحقق عبر الرسائل، حاول مرة أخرى' }, 502);
  }
  return jsonResponse({ ok: true, sms_configured: smsConfigured, dev_code: smsConfigured ? undefined : code });
});
