import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

const INVALID_CREDENTIALS_MESSAGE = 'رقم الهوية أو كلمة المرور غير صحيحة';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'بيانات غير صالحة' }, 400);
  }

  const nationalId = String(body.national_id ?? '').trim();
  const password = String(body.password ?? '');
  if (!nationalId || !password) return jsonResponse({ error: INVALID_CREDENTIALS_MESSAGE }, 400);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // حدّ محاولات: يمنع تجربة كلمات مرور/أرقام هوية بلا نهاية آليًا، ويُرفَض الطلب
  // فورًا دون حتى محاولة التحقق من كلمة المرور عند تجاوز الحد.
  const { data: allowed, error: rateLimitError } = await admin.rpc('rpc_check_login_rate_limit', { p_national_id: nationalId });
  if (rateLimitError) return jsonResponse({ error: 'تعذّر معالجة الطلب' }, 500);
  if (!allowed) return jsonResponse({ error: 'محاولات كثيرة جدًا، يرجى المحاولة لاحقًا' }, 429);

  // البريد الإلكتروني يُستخدَم داخليًا فقط لإتمام تسجيل الدخول عبر GoTrue مباشرة
  // من الخادم، ولا يصل للمتصفح إطلاقًا — بخلاف الدالة السابقة (login_email_for_national_id)
  // التي كانت تُعيد البريد مباشرة لأي طرف يستدعيها، بلا تحقق أو حد محاولات.
  const { data: profile } = await admin.from('profiles').select('email').eq('national_id', nationalId).maybeSingle();
  if (!profile?.email) return jsonResponse({ error: INVALID_CREDENTIALS_MESSAGE }, 400);

  const tokenRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: profile.email, password }),
  });

  if (!tokenRes.ok) return jsonResponse({ error: INVALID_CREDENTIALS_MESSAGE }, 400);
  const session = await tokenRes.json();

  await admin.rpc('rpc_reset_login_rate_limit', { p_national_id: nationalId });

  return jsonResponse({ access_token: session.access_token, refresh_token: session.refresh_token });
});
