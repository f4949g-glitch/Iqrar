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

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'بيانات غير صالحة' }, 400);
  }

  const nationalId = String(body.national_id ?? '').trim();
  const code = String(body.code ?? '').trim();
  const newPassword = String(body.new_password ?? '');

  if (!nationalId || !code || !newPassword) return jsonResponse({ error: 'جميع الحقول مطلوبة' }, 400);
  if (newPassword.length < 8) return jsonResponse({ error: 'يجب ألا تقل كلمة المرور عن 8 أحرف' }, 400);

  const { data: otp } = await admin.schema('private').from('password_reset_otps').select('*').eq('national_id', nationalId).maybeSingle();
  if (!otp) return jsonResponse({ error: 'لم يتم طلب رمز تحقق لهذا الحساب' }, 400);
  if (new Date(otp.expires_at as string).getTime() < Date.now()) {
    return jsonResponse({ error: 'انتهت صلاحية رمز التحقق، يرجى طلب رمز جديد' }, 400);
  }
  if (otp.attempts >= 5) return jsonResponse({ error: 'تجاوزت عدد المحاولات المسموح، اطلب رمزًا جديدًا' }, 429);

  if (otp.code !== code) {
    await admin.schema('private').from('password_reset_otps').update({ attempts: (otp.attempts as number) + 1 }).eq('national_id', nationalId);
    return jsonResponse({ error: 'رمز التحقق غير صحيح' }, 400);
  }

  const { data: profile } = await admin.from('profiles').select('id').eq('national_id', nationalId).maybeSingle();
  if (!profile) return jsonResponse({ error: 'الحساب غير موجود' }, 404);

  const { error: updateError } = await admin.auth.admin.updateUserById(profile.id, { password: newPassword });
  if (updateError) return jsonResponse({ error: 'تعذّر تحديث كلمة المرور: ' + updateError.message }, 500);

  await admin.schema('private').from('password_reset_otps').delete().eq('national_id', nationalId);

  return jsonResponse({ ok: true });
});
