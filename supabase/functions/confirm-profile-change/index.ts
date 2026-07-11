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
  const code = String(body.code ?? '').trim();
  if (field !== 'email' && field !== 'phone') return jsonResponse({ error: 'حقل غير صالح' }, 400);
  if (!code) return jsonResponse({ error: 'رمز التحقق مطلوب' }, 400);

  const { data: otpRows } = await admin.rpc('rpc_get_profile_change_otp', { p_user_id: callerData.user.id, p_field: field });
  const otp = otpRows?.[0];
  if (!otp) return jsonResponse({ error: 'لم يتم طلب رمز تحقق لهذا الحقل' }, 400);
  if (new Date(otp.expires_at as string).getTime() < Date.now()) {
    return jsonResponse({ error: 'انتهت صلاحية رمز التحقق، يرجى طلب رمز جديد' }, 400);
  }
  if ((otp.attempts as number) >= 5) return jsonResponse({ error: 'تجاوزت عدد المحاولات المسموح، اطلب رمزًا جديدًا' }, 429);

  if (otp.code !== code) {
    await admin.rpc('rpc_increment_profile_change_otp_attempts', { p_user_id: callerData.user.id, p_field: field });
    return jsonResponse({ error: 'رمز التحقق غير صحيح' }, 400);
  }

  const newValue = otp.new_value as string;

  if (field === 'email') {
    const { error: emailUpdateError } = await admin.auth.admin.updateUserById(callerData.user.id, { email: newValue, email_confirm: true });
    if (emailUpdateError) return jsonResponse({ error: 'تعذّر تحديث البريد الإلكتروني' }, 500);
    const { error: profileError } = await admin.from('profiles').update({ email: newValue }).eq('id', callerData.user.id);
    if (profileError) return jsonResponse({ error: 'تعذّر تحديث البريد الإلكتروني' }, 500);
  } else {
    const { error: profileError } = await admin.from('profiles').update({ phone: newValue }).eq('id', callerData.user.id);
    if (profileError) return jsonResponse({ error: 'تعذّر تحديث رقم الجوال' }, 500);
  }

  await admin.rpc('rpc_delete_profile_change_otp', { p_user_id: callerData.user.id, p_field: field });

  return jsonResponse({ ok: true, new_value: newValue });
});
