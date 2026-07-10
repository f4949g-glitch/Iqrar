import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

const ALLOWED_PERMISSIONS = new Set(['view_reports', 'create_discount_codes', 'create_discount_codes_direct']);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // يتحقق من أن طالب الإنشاء أدمن كامل فعليًا عبر رمز الدخول المُرسَل، بدل الوثوق
  // بأي قيمة قد يُرسلها العميل — إنشاء حسابات إدارية عملية حسّاسة يجب تأكيدها خادميًا.
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'يلزم تسجيل الدخول' }, 401);
  const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: callerData } = await callerClient.auth.getUser();
  if (!callerData.user) return jsonResponse({ error: 'يلزم تسجيل الدخول' }, 401);

  const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', callerData.user.id).maybeSingle();
  if (callerProfile?.role !== 'admin') return jsonResponse({ error: 'هذا الإجراء متاح لمدير المنصة فقط' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'بيانات غير صالحة' }, 400);
  }

  const fullName = String(body.full_name ?? '').trim();
  const nationalId = String(body.national_id ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const phone = String(body.phone ?? '').trim();
  const permissions = Array.isArray(body.permissions) ? (body.permissions as unknown[]).map(String).filter((p) => ALLOWED_PERMISSIONS.has(p)) : [];

  if (!fullName || !nationalId || !email) {
    return jsonResponse({ error: 'الاسم ورقم الهوية والبريد الإلكتروني مطلوبة' }, 400);
  }
  if (!/^\d{10}$/.test(nationalId)) return jsonResponse({ error: 'رقم الهوية يجب أن يتكون من 10 أرقام فقط' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonResponse({ error: 'أدخل بريدًا إلكترونيًا صحيحًا' }, 400);

  const { data: existingNid } = await admin.from('profiles').select('id').eq('national_id', nationalId).maybeSingle();
  if (existingNid) return jsonResponse({ error: 'يوجد حساب مسجَّل بهذا الرقم للهوية بالفعل' }, 409);

  // كلمة مرور مؤقتة عشوائية؛ الحساب يُجبَر على تغييرها عند أول تسجيل دخول
  // (must_change_password يبقى على قيمته الافتراضية true).
  const tempPassword = `Iq${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}!A1`;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createError || !created?.user) {
    return jsonResponse({ error: createError?.message ?? 'تعذّر إنشاء الحساب' }, 500);
  }

  const { error: profileError } = await admin
    .from('profiles')
    .update({
      full_name: fullName,
      national_id: nationalId,
      phone: phone || null,
      role: 'sub_admin',
      admin_permissions: permissions,
    })
    .eq('id', created.user.id);
  if (profileError) {
    return jsonResponse({ error: 'أُنشئ الحساب لكن تعذّر ضبط بياناته: ' + profileError.message }, 500);
  }

  return jsonResponse({ ok: true, national_id: nationalId, temp_password: tempPassword });
});
