import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendSms } from '../_shared/sms.ts';
import { renderSmsTemplate } from '../_shared/templates.ts';

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
  const code = String(body.code ?? '').trim();
  const fullName = String(body.full_name ?? '').trim();
  const nationalId = String(body.national_id ?? '').trim();
  const nationality = String(body.nationality ?? '').trim();
  const dateOfBirth = String(body.date_of_birth ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');

  if (!fullName || !nationalId || !email || !password || !code) {
    return jsonResponse({ error: 'جميع الحقول مطلوبة' }, 400);
  }
  if (!/^\d{10}$/.test(nationalId)) return jsonResponse({ error: 'رقم الهوية يجب أن يتكون من 10 أرقام فقط' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonResponse({ error: 'أدخل بريدًا إلكترونيًا صحيحًا يحتوي على علامة @' }, 400);
  if (
    password.length < 8 ||
    password.length > 15 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    return jsonResponse({ error: 'كلمة المرور يجب أن تكون بين 8 و15 حرفًا وتحتوي على حرف كبير وصغير ورقم ورمز' }, 400);
  }

  const { data: otpRows } = await admin.rpc('rpc_get_registration_otp', { p_phone: phone });
  const otp = otpRows?.[0];
  if (!otp) return jsonResponse({ error: 'لم يتم طلب رمز تحقق لهذا الرقم' }, 400);
  if (new Date(otp.expires_at as string).getTime() < Date.now()) {
    return jsonResponse({ error: 'انتهت صلاحية رمز التحقق، يرجى طلب رمز جديد' }, 400);
  }
  if (otp.attempts >= 5) return jsonResponse({ error: 'تجاوزت عدد المحاولات المسموح، اطلب رمزًا جديدًا' }, 429);

  if (otp.code !== code) {
    await admin.rpc('rpc_increment_registration_otp_attempts', { p_phone: phone });
    return jsonResponse({ error: 'رمز التحقق غير صحيح' }, 400);
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createError || !created?.user) {
    return jsonResponse({ error: createError?.message ?? 'تعذّر إنشاء الحساب' }, 500);
  }

  const { error: profileError } = await admin
    .from('profiles')
    .update({ full_name: fullName, national_id: nationalId, nationality: nationality || null, date_of_birth: dateOfBirth || null, phone })
    .eq('id', created.user.id);
  if (profileError) {
    return jsonResponse({ error: 'أُنشئ الحساب لكن تعذّر حفظ بيانات الهوية: ' + profileError.message }, 500);
  }

  await admin.rpc('rpc_delete_registration_otp', { p_phone: phone });

  const welcomeText = await renderSmsTemplate(
    admin,
    'welcome',
    { name: fullName },
    `مرحبًا ${fullName}، تم إنشاء حسابك في منصة إقرار بنجاح.`,
  );
  await sendSms(phone, welcomeText);

  return jsonResponse({ ok: true });
});
