import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendSms, isSmsConfigured } from '../_shared/sms.ts';
import { generateOtpCode } from '../_shared/otp.ts';

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

  const { data: profile } = await admin.from('profiles').select('id, phone').eq('national_id', nationalId).maybeSingle();
  if (!profile || !profile.phone) {
    return jsonResponse({ error: 'لا يوجد حساب برقم جوال مسجَّل مطابق لهذا الرقم' }, 404);
  }

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: upsertError } = await admin.rpc('rpc_upsert_password_reset_otp', {
    p_national_id: nationalId,
    p_code: code,
    p_expires_at: expiresAt,
  });
  if (upsertError) return jsonResponse({ error: 'تعذّر إنشاء رمز التحقق' }, 500);

  const smsConfigured = isSmsConfigured();
  if (smsConfigured) {
    const sendResult = await sendSms(profile.phone, `رمز استعادة كلمة المرور في منصة إقرار: ${code} (صالح لمدة 10 دقائق)`);
    if (!sendResult.ok) return jsonResponse({ error: 'تعذّر إرسال رمز التحقق عبر الرسائل، حاول مرة أخرى' }, 502);
  }

  return jsonResponse({ ok: true, sms_configured: smsConfigured, dev_code: smsConfigured ? undefined : code });
});
