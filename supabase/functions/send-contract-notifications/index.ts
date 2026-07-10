import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/email.ts';
import { sendSms } from '../_shared/sms.ts';
import { ensurePartyAccount } from '../_shared/ensurePartyAccount.ts';

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const {
    data: { user: callerUser },
  } = await callerClient.auth.getUser();
  if (!callerUser) return jsonResponse({ error: 'غير مصرَّح: يلزم تسجيل الدخول' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'بيانات غير صالحة' }, 400);
  }

  const contractId = String(body.contract_id ?? '');
  const partyId = body.party_id ? String(body.party_id) : null;
  if (!contractId) return jsonResponse({ error: 'contract_id مطلوب' }, 400);

  const { data: contract, error: contractError } = await admin.from('contracts').select('id, title, created_by').eq('id', contractId).single();
  if (contractError || !contract) return jsonResponse({ error: 'العقد غير موجود' }, 404);
  if (contract.created_by !== callerUser.id) {
    const { data: profile } = await admin.from('profiles').select('role').eq('id', callerUser.id).maybeSingle();
    if (profile?.role !== 'admin') return jsonResponse({ error: 'غير مصرَّح' }, 403);
  }

  const { data: creatorProfile } = await admin.from('profiles').select('full_name, email').eq('id', contract.created_by).maybeSingle();
  const creatorName = creatorProfile?.full_name || creatorProfile?.email || 'منشئ العقد';

  // party_id: عند إعادة الإرسال لطرف رافض تحديدًا، لا نُشعِر بقية الأطراف من جديد.
  let partiesQuery = admin.from('contract_parties').select('*').eq('contract_id', contractId);
  if (partyId) partiesQuery = partiesQuery.eq('id', partyId);
  const { data: parties, error: partiesError } = await partiesQuery;
  if (partiesError) return jsonResponse({ error: 'تعذّر تحميل أطراف العقد' }, 500);

  const origin = req.headers.get('origin') ?? Deno.env.get('APP_ORIGIN') ?? '';
  let sent = 0;

  for (const party of parties ?? []) {
    const link = `${origin}/sign/${party.token}`;
    const account = await ensurePartyAccount(admin, party);

    const accountBlock = account.created
      ? `<p>كما تم إنشاء حساب لك على المنصة لمتابعة عقودك لاحقًا: <br/>البريد: ${party.email}<br/>كلمة المرور المؤقتة: ${account.tempPassword}</p>`
      : '';

    if (party.email) {
      await sendEmail(
        party.email,
        'لديك طلب توثيق جديد',
        `<p>مرحباً ${party.full_name}،</p>
         <p>لديك طلب توثيق جديد من (${creatorName})، يرجى الدخول إلى المنصة للاطلاع على العقد "${contract.title}" واستكمال إجراءات التوثيق.</p>
         <p><a href="${link}">اضغط هنا لمراجعة العقد والتوقيع</a></p>
         ${accountBlock}`,
      );
      sent += 1;
    }
    if (party.phone) {
      await sendSms(party.phone, `لديك طلب توثيق جديد من (${creatorName}) عبر منصة إقرار. رابط العقد: ${link}`);
    }
  }

  return jsonResponse({ success: true, sent });
});
