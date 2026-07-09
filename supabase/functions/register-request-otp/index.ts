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

function normalizePhone(phone: string): string {
  return phone.trim().replace(/\s|-/g, '');
}

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

  if (!/^05\d{8}$/.test(phone)) return jsonResponse({ error: 'رقم جوال سعودي غير صحيح (مثال: 05xxxxxxxx)' }, 400);
  if (!/^[12]\d{9}$/.test(nationalId)) return jsonResponse({ error: 'رقم الهوية غير صحيح' }, 400);
  if (!email) return jsonResponse({ error: 'البريد الإلكتروني مطلوب' }, 400);

  const { data: existingNid } = await admin.from('profiles').select('id').eq('national_id', nationalId).maybeSingle();
  if (existingNid) return jsonResponse({ error: 'يوجد حساب مسجَّل بهذا الرقم للهوية بالفعل' }, 409);

  const { data: existingEmail } = await admin.from('profiles').select('id').eq('email', email).maybeSingle();
  if (existingEmail) return jsonResponse({ error: 'يوجد حساب مسجَّل بهذا البريد الإلكتروني بالفعل' }, 409);

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: upsertError } = await admin
    .schema('private')
    .from('registration_otps')
    .upsert({ phone, code, attempts: 0, expires_at: expiresAt }, { onConflict: 'phone' });
  if (upsertError) return jsonResponse({ error: 'تعذّر إنشاء رمز التحقق' }, 500);

  const smsConfigured = Boolean(Deno.env.get('FOURJAWALY_API_KEY') && Deno.env.get('FOURJAWALY_API_KEY') !== '1234');
  await sendSms(phone, `رمز التحقق لإنشاء حساب إقرار: ${code} (صالح لمدة 10 دقائق)`);

  return jsonResponse({ ok: true, sms_configured: smsConfigured, dev_code: smsConfigured ? undefined : code });
});
