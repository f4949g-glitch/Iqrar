import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendSms, isSmsConfigured } from '../_shared/sms.ts';
import { sendEmail, isEmailConfigured } from '../_shared/email.ts';
import { generateOtpCode } from '../_shared/otp.ts';
import { otpCooldownMessage } from '../_shared/otpCooldown.ts';

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'بيانات غير صالحة' }, 400);
  }

  const nationalId = String(body.national_id ?? '').trim();
  if (!nationalId) return jsonResponse({ error: 'رقم الهوية مطلوب' }, 400);

  const { data: profile } = await admin.from('profiles').select('id, phone, email').eq('national_id', nationalId).maybeSingle();
  if (!profile || (!profile.phone && !profile.email)) {
    return jsonResponse({ error: 'لا يوجد حساب برقم جوال أو بريد إلكتروني مسجَّل مطابق لهذا الرقم' }, 404);
  }

  const { data: existingOtpRows } = await admin.rpc('rpc_get_password_reset_otp', { p_national_id: nationalId });
  const cooldownError = otpCooldownMessage(existingOtpRows?.[0]?.created_at);
  if (cooldownError) return jsonResponse({ error: cooldownError }, 429);

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: upsertError } = await admin.rpc('rpc_upsert_password_reset_otp', {
    p_national_id: nationalId,
    p_code: code,
    p_expires_at: expiresAt,
  });
  if (upsertError) return jsonResponse({ error: 'تعذّر إنشاء رمز التحقق' }, 500);

  // يُرسَل الرمز عبر كل قناة متاحة (جوال وبريد) بدلًا من الاعتماد على قناة
  // واحدة فقط؛ النجاح في أي قناة كافٍ، ولا يُعتبر الطلب فاشلًا إلا إذا فشلت
  // كل القنوات التي حاولنا الإرسال عبرها فعليًا.
  const smsConfigured = isSmsConfigured();
  const emailConfigured = isEmailConfigured();
  let attempted = false;
  let anySent = false;

  if (smsConfigured && profile.phone) {
    attempted = true;
    const result = await sendSms(profile.phone, `رمز استعادة كلمة المرور في منصة إقرار: ${code} (صالح لمدة 10 دقائق)`);
    if (result.ok) anySent = true;
  }

  if (emailConfigured && profile.email) {
    attempted = true;
    const result = await sendEmail(
      profile.email,
      'رمز استعادة كلمة المرور',
      `<p>رمز استعادة كلمة المرور في منصة إقرار: <b>${code}</b> (صالح لمدة 10 دقائق)</p><p>إن لم تطلب هذا، تجاهل هذه الرسالة.</p>`,
    );
    if (result.ok) anySent = true;
  }

  if (attempted && !anySent) return jsonResponse({ error: 'تعذّر إرسال رمز التحقق، حاول مرة أخرى' }, 502);

  return jsonResponse({ ok: true, sms_configured: smsConfigured, email_configured: emailConfigured, dev_code: attempted ? undefined : code });
});
