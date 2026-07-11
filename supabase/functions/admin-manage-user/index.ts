import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// حظر شبه دائم عبر Supabase Auth (لا يوجد "حظر إلى الأبد" حرفيًا، فنستخدم مدة
// طويلة جدًا)؛ 'none' يرفع الحظر عند إعادة التفعيل.
const SUSPEND_DURATION = '876000h';

const ALLOWED_ACTIONS = new Set(['suspend', 'reactivate', 'delete', 'reset_password']);

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

  const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', callerData.user.id).maybeSingle();
  if (callerProfile?.role !== 'admin') return jsonResponse({ error: 'هذا الإجراء متاح لمدير المنصة فقط' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'بيانات غير صالحة' }, 400);
  }

  const userId = String(body.user_id ?? '').trim();
  const action = String(body.action ?? '').trim();
  if (!userId || !ALLOWED_ACTIONS.has(action)) return jsonResponse({ error: 'طلب غير صالح' }, 400);

  const { data: targetProfile } = await admin.from('profiles').select('id, role, suspended_at').eq('id', userId).maybeSingle();
  if (!targetProfile) return jsonResponse({ error: 'المستخدم غير موجود' }, 404);
  // هذه الإجراءات مخصّصة لحسابات العملاء فقط؛ لا تُطبَّق على حسابات الإدارة
  // لتفادي إيقاف/حذف حساب أدمن بالخطأ.
  if (targetProfile.role !== 'member') return jsonResponse({ error: 'هذا الإجراء متاح فقط لحسابات العملاء' }, 400);

  if (action === 'suspend') {
    const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: SUSPEND_DURATION });
    if (error) return jsonResponse({ error: 'تعذّر إيقاف الحساب: ' + error.message }, 500);
    await admin.from('profiles').update({ suspended_at: new Date().toISOString() }).eq('id', userId);
    return jsonResponse({ ok: true });
  }

  if (action === 'reactivate') {
    const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: 'none' });
    if (error) return jsonResponse({ error: 'تعذّر إعادة تفعيل الحساب: ' + error.message }, 500);
    await admin.from('profiles').update({ suspended_at: null }).eq('id', userId);
    return jsonResponse({ ok: true });
  }

  if (action === 'delete') {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      // قيد قاعدة البيانات يمنع حذف مستخدم له عقود أو سجلات مرتبطة (تُحفَظ
      // كسجل قانوني)، فنعرض سببًا واضحًا بدل رسالة الخطأ التقنية.
      const isForeignKeyViolation = /foreign key|violates|constraint/i.test(error.message);
      if (isForeignKeyViolation) {
        return jsonResponse({ error: 'لا يمكن حذف هذا الحساب لوجود عقود أو سجلات مرتبطة به. يمكنك إيقاف الحساب بدلًا من حذفه.' }, 409);
      }
      return jsonResponse({ error: 'تعذّر حذف الحساب: ' + error.message }, 500);
    }
    return jsonResponse({ ok: true });
  }

  // reset_password: كلمة مرور مؤقتة عشوائية جديدة، تُعرض للأدمن ليُرسلها
  // للعميل يدويًا (رسالة نصية أو رابط) بما أن بوابات الإرسال غير مفعّلة بعد؛
  // الحساب يُجبَر على تغييرها عند أول دخول به.
  const tempPassword = `Iq${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}!A1`;
  const { error: pwError } = await admin.auth.admin.updateUserById(userId, { password: tempPassword });
  if (pwError) return jsonResponse({ error: 'تعذّر إعادة تعيين كلمة المرور: ' + pwError.message }, 500);
  const { error: flagError } = await admin.from('profiles').update({ must_change_password: true }).eq('id', userId);
  if (flagError) return jsonResponse({ error: 'أُعيد ضبط كلمة المرور لكن تعذّر تفعيل إلزام تغييرها: ' + flagError.message }, 500);
  return jsonResponse({ ok: true, temp_password: tempPassword });
});
