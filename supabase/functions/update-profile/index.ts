import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

const NATIONALITIES = new Set(['سعودي', 'مقيم']);

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

  const targetUserId = String(body.user_id ?? callerData.user.id);
  const editingSelf = targetUserId === callerData.user.id;

  // تعديل بيانات مستخدم آخر متاح للأدمن الكامل فقط — التحقق يتم خادميًا دومًا
  // بدل الوثوق بأي دور يُرسله العميل.
  if (!editingSelf) {
    const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', callerData.user.id).maybeSingle();
    if (callerProfile?.role !== 'admin') return jsonResponse({ error: 'هذا الإجراء متاح لمدير المنصة فقط' }, 403);
  }

  const { data: target } = await admin.from('profiles').select('*').eq('id', targetUserId).maybeSingle();
  if (!target) return jsonResponse({ error: 'المستخدم غير موجود' }, 404);

  const fullName = String(body.full_name ?? '').trim();
  const nationalId = String(body.national_id ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const nationality = String(body.nationality ?? '').trim();
  const dateOfBirth = body.date_of_birth ? String(body.date_of_birth).trim() : null;
  const phoneRaw = body.phone ? String(body.phone).trim() : '';

  if (!fullName) return jsonResponse({ error: 'الاسم مطلوب' }, 400);
  if (!/^\d{10}$/.test(nationalId)) return jsonResponse({ error: 'رقم الهوية يجب أن يتكون من 10 أرقام فقط' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonResponse({ error: 'أدخل بريدًا إلكترونيًا صحيحًا' }, 400);
  if (!NATIONALITIES.has(nationality)) return jsonResponse({ error: 'الجنسية غير صالحة' }, 400);
  if (phoneRaw && !/^9665\d{8}$/.test(phoneRaw)) return jsonResponse({ error: 'رقم جوال سعودي غير صحيح (مثال: 966501234567)' }, 400);
  if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return jsonResponse({ error: 'تاريخ الميلاد غير صالح' }, 400);

  if (nationalId !== target.national_id) {
    const { data: existingNid } = await admin.from('profiles').select('id').eq('national_id', nationalId).neq('id', targetUserId).maybeSingle();
    if (existingNid) return jsonResponse({ error: 'يوجد حساب آخر مسجَّل بهذا الرقم للهوية بالفعل' }, 409);
  }

  if (email !== target.email) {
    const { error: emailUpdateError } = await admin.auth.admin.updateUserById(targetUserId, { email, email_confirm: true });
    if (emailUpdateError) {
      const msg = emailUpdateError.message.includes('already been registered') ? 'هذا البريد الإلكتروني مستخدَم بالفعل' : 'تعذّر تحديث البريد الإلكتروني';
      return jsonResponse({ error: msg }, 400);
    }
  }

  const { data: updated, error: updateError } = await admin
    .from('profiles')
    .update({
      full_name: fullName,
      national_id: nationalId,
      email,
      nationality,
      date_of_birth: dateOfBirth,
      phone: phoneRaw || null,
    })
    .eq('id', targetUserId)
    .select('*')
    .single();
  if (updateError) return jsonResponse({ error: 'تعذّر حفظ البيانات: ' + updateError.message }, 500);

  return jsonResponse({ ok: true, profile: updated });
});
