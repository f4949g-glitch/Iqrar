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

// يُخفي معظم أرقام الجوال في الرسالة المعروضة للطرف الموقّع، ولا يُرسل الرقم
// الفعلي للواجهة أبدًا.
function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  return `${phone.slice(0, 3)}${'•'.repeat(phone.length - 5)}${phone.slice(-2)}`;
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

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: party, error: partyError } = await admin.from('contract_parties').select('id, national_id, status').eq('token', token).maybeSingle();
  if (partyError || !party) return jsonResponse({ error: 'الرابط غير صالح أو منتهي' }, 404);
  if (!party.national_id) return jsonResponse({ error: 'لا يوجد توقيع محفوظ مرتبط بهذا الطرف' }, 400);

  const { data: ownerProfile } = await admin
    .from('profiles')
    .select('phone, signature_data_url')
    .eq('national_id', party.national_id)
    .maybeSingle();

  if (!ownerProfile?.signature_data_url || !ownerProfile.phone) {
    return jsonResponse({ error: 'لا يوجد توقيع محفوظ مرتبط بهذا الطرف' }, 400);
  }

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const { error: upsertError } = await admin.rpc('rpc_upsert_signing_otp', { p_party_id: party.id, p_code: code, p_expires_at: expiresAt });
  if (upsertError) return jsonResponse({ error: 'تعذّر إنشاء رمز التحقق' }, 500);

  const smsConfigured = isSmsConfigured();
  if (smsConfigured) {
    const sendResult = await sendSms(ownerProfile.phone, `رمز التحقق لاستخدام توقيعك المحفوظ في منصة إقرار: ${code} (صالح لمدة 5 دقائق)`);
    if (!sendResult.ok) return jsonResponse({ error: 'تعذّر إرسال رمز التحقق عبر الرسائل، حاول مرة أخرى' }, 502);
  }

  return jsonResponse({
    ok: true,
    sms_configured: smsConfigured,
    dev_code: smsConfigured ? undefined : code,
    phone_hint: maskPhone(ownerProfile.phone),
  });
});
