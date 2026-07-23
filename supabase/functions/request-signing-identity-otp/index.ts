import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendSms, isSmsConfigured } from '../_shared/sms.ts';
import { generateOtpCode } from '../_shared/otp.ts';
import { maskPhone } from '../_shared/phone.ts';
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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'بيانات غير صالحة' }, 400);
  }

  const token = String(body.token ?? '').trim();
  if (!token) return jsonResponse({ error: 'رابط غير صالح' }, 400);
  const sessionId = String(body.session_id ?? '').trim();
  if (!sessionId) return jsonResponse({ error: 'جلسة غير صالحة' }, 400);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: party, error: partyError } = await admin
    .from('contract_parties')
    .select('id, verification_method, phone')
    .eq('token', token)
    .maybeSingle();
  if (partyError || !party) return jsonResponse({ error: 'الرابط غير صالح أو منتهي' }, 404);

  // التحقق عبر رمز SMS إلزامي فقط للأطراف بطريقة "يدوي" — طرف نفاذ تحقَّقت
  // هويته أصلًا عبر النظام الحكومي فلا داعي لتكرار التحقق.
  if (party.verification_method !== 'manual') {
    return jsonResponse({ ok: true, required: false });
  }
  if (!party.phone) {
    return jsonResponse({ error: 'لا يوجد رقم جوال مسجَّل لهذا الطرف، تواصل مع منشئ العقد لإضافته' }, 400);
  }

  const { data: existingOtpRows } = await admin.rpc('rpc_get_signing_identity_otp', { p_party_id: party.id });
  const cooldownError = otpCooldownMessage(existingOtpRows?.[0]?.created_at);
  if (cooldownError) return jsonResponse({ error: cooldownError }, 429);

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const { error: upsertError } = await admin.rpc('rpc_upsert_signing_identity_otp', {
    p_party_id: party.id,
    p_code: code,
    p_expires_at: expiresAt,
    p_session_id: sessionId,
  });
  if (upsertError) return jsonResponse({ error: 'تعذّر إنشاء رمز التحقق' }, 500);

  const smsConfigured = isSmsConfigured();
  if (smsConfigured) {
    const sendResult = await sendSms(party.phone, `رمز التحقق من هويتك لفتح رابط التوثيق في منصة إقرار: ${code} (صالح لمدة 5 دقائق)`);
    if (!sendResult.ok) return jsonResponse({ error: 'تعذّر إرسال رمز التحقق عبر الرسائل، حاول مرة أخرى' }, 502);
  }

  return jsonResponse({
    ok: true,
    required: true,
    sms_configured: smsConfigured,
    dev_code: smsConfigured ? undefined : code,
    phone_hint: maskPhone(party.phone),
  });
});
