import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendSms } from '../_shared/sms.ts';

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

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: upsertError } = await admin
    .schema('private')
    .from('password_reset_otps')
    .upsert({ national_id: nationalId, code, attempts: 0, expires_at: expiresAt }, { onConflict: 'national_id' });
  if (upsertError) return jsonResponse({ error: 'تعذّر إنشاء رمز التحقق' }, 500);

  const smsConfigured = Boolean(Deno.env.get('FOURJAWALY_API_KEY') && Deno.env.get('FOURJAWALY_API_KEY') !== '1234');
  await sendSms(profile.phone, `رمز استعادة كلمة المرور في منصة إقرار: ${code} (صالح لمدة 10 دقائق)`);

  return jsonResponse({ ok: true, sms_configured: smsConfigured, dev_code: smsConfigured ? undefined : code });
});
