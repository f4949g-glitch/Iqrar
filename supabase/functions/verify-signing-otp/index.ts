import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

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
  const code = String(body.code ?? '').trim();
  if (!token || !code) return jsonResponse({ error: 'بيانات غير صالحة' }, 400);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: party, error: partyError } = await admin.from('contract_parties').select('id, national_id').eq('token', token).maybeSingle();
  if (partyError || !party) return jsonResponse({ error: 'الرابط غير صالح أو منتهي' }, 404);

  const { data: otpRows } = await admin.rpc('rpc_get_signing_otp', { p_party_id: party.id });
  const otp = otpRows?.[0];
  if (!otp) return jsonResponse({ error: 'لم يتم طلب رمز تحقق، أعد المحاولة' }, 400);
  if (new Date(otp.expires_at as string).getTime() < Date.now()) {
    return jsonResponse({ error: 'انتهت صلاحية رمز التحقق، اطلب رمزًا جديدًا' }, 400);
  }
  if (otp.attempts >= 5) return jsonResponse({ error: 'تجاوزت عدد المحاولات المسموح، اطلب رمزًا جديدًا' }, 429);

  if (otp.code !== code) {
    await admin.rpc('rpc_increment_signing_otp_attempts', { p_party_id: party.id });
    return jsonResponse({ error: 'رمز التحقق غير صحيح' }, 400);
  }

  const { data: ownerProfile } = await admin.from('profiles').select('signature_data_url').eq('national_id', party.national_id).maybeSingle();
  if (!ownerProfile?.signature_data_url) return jsonResponse({ error: 'لم يعد التوقيع المحفوظ متاحًا' }, 400);

  await admin.rpc('rpc_mark_signing_otp_verified', { p_party_id: party.id });

  return jsonResponse({ ok: true, signature_data_url: ownerProfile.signature_data_url });
});
