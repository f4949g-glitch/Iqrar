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

function normalizePhone(phone: string): string {
  return phone.trim().replace(/\s|-/g, '');
}

// صيغة دولية بدون "+": 966 ثم 9 أرقام تبدأ بـ5 (مثال: 966501234567).
const PHONE_RE = /^9665\d{8}$/;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'بيانات غير صالحة' }, 400);
  }

  const phone = normalizePhone(String(body.phone ?? ''));
  const nationalId = String(body.national_id ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();

  if (!PHONE_RE.test(phone)) return jsonResponse({ error: 'رقم جوال سعودي غير صحيح (مثال: 966501234567)' }, 400);
  if (!/^[12]\d{9}$/.test(nationalId)) return jsonResponse({ error: 'رقم الهوية غير صحيح' }, 400);
  if (!email) return jsonResponse({ error: 'البريد الإلكتروني مطلوب' }, 400);

  const { data: existingNid } = await admin.from('profiles').select('id').eq('national_id', nationalId).maybeSingle();
  if (existingNid) return jsonResponse({ error: 'يوجد حساب مسجَّل بهذا الرقم للهوية بالفعل' }, 409);

  const { data: existingEmail } = await admin.from('profiles').select('id').eq('email', email).maybeSingle();
  if (existingEmail) return jsonResponse({ error: 'يوجد حساب مسجَّل بهذا البريد الإلكتروني بالفعل' }, 409);

  const { data: existingOtpRows } = await admin.rpc('rpc_get_registration_otp', { p_phone: phone });
  const cooldownError = otpCooldownMessage(existingOtpRows?.[0]?.created_at);
  if (cooldownError) return jsonResponse({ error: cooldownError }, 429);

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: upsertError } = await admin.rpc('rpc_upsert_registration_otp', { p_phone: phone, p_code: code, p_expires_at: expiresAt });
  if (upsertError) return jsonResponse({ error: 'تعذّر إنشاء رمز التحقق' }, 500);

  // يُرسَل الرمز عبر الجوال والبريد معًا (كلاهما مطلوبان عند التسجيل)؛ النجاح
  // في أي قناة كافٍ لعدم اعتبار الطلب فاشلًا.
  const smsConfigured = isSmsConfigured();
  const emailConfigured = isEmailConfigured();
  let attempted = false;
  let anySent = false;

  if (smsConfigured) {
    attempted = true;
    const result = await sendSms(phone, `رمز التحقق لإنشاء حساب إقرار: ${code} (صالح لمدة 10 دقائق)`);
    if (result.ok) anySent = true;
  }

  if (emailConfigured) {
    attempted = true;
    const result = await sendEmail(
      email,
      'رمز تأكيد إنشاء الحساب',
      `<p>رمز التحقق لإنشاء حسابك في منصة إقرار: <b>${code}</b> (صالح لمدة 10 دقائق)</p>`,
    );
    if (result.ok) anySent = true;
  }

  if (attempted && !anySent) return jsonResponse({ error: 'تعذّر إرسال رمز التحقق، حاول مرة أخرى' }, 502);

  return jsonResponse({ ok: true, sms_configured: smsConfigured, email_configured: emailConfigured, dev_code: attempted ? undefined : code });
});
