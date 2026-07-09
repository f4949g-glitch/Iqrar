import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { checkNafathStatus } from '../_shared/nafath.ts';

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

  const partyId = String(body.party_id ?? '');
  if (!partyId) return jsonResponse({ error: 'party_id مطلوب' }, 400);

  const { data: party, error: partyError } = await admin.from('contract_parties').select('*, contracts!inner(created_by)').eq('id', partyId).single();
  if (partyError || !party) return jsonResponse({ error: 'الطرف غير موجود' }, 404);

  const contractCreatedBy = (party as unknown as { contracts: { created_by: string } }).contracts.created_by;
  if (contractCreatedBy !== callerUser.id) {
    const { data: profile } = await admin.from('profiles').select('role').eq('id', callerUser.id).maybeSingle();
    if (profile?.role !== 'admin') return jsonResponse({ error: 'غير مصرَّح' }, 403);
  }

  if (!party.national_id || !party.nafath_trans_id) {
    return jsonResponse({ error: 'لم يبدأ طلب تحقق عبر نفاذ لهذا الطرف' }, 400);
  }

  const result = await checkNafathStatus(party.national_id, party.nafath_trans_id);

  if (!result.configured) {
    return jsonResponse({ configured: false, message: 'التحقق عبر نفاذ غير مُفعَّل بعد على هذه المنصة.' });
  }
  if (result.error) {
    return jsonResponse({ error: `تعذّر التحقق من حالة نفاذ: ${result.error}` }, 502);
  }

  if (result.status === 'completed' && result.fullName) {
    await admin
      .from('contract_parties')
      .update({ full_name: result.fullName, nafath_status: 'completed', nafath_verified_at: new Date().toISOString() })
      .eq('id', partyId);
    await admin.from('contract_events').insert({
      contract_id: party.contract_id,
      party_id: partyId,
      event_type: 'nafath_verified',
      message: `تم التحقق من هوية ${result.fullName} عبر نفاذ (رقم العملية: ${party.nafath_trans_id})`,
    });
  } else if (result.status && result.status !== 'pending') {
    await admin.from('contract_parties').update({ nafath_status: result.status }).eq('id', partyId);
  }

  return jsonResponse({ configured: true, status: result.status, full_name: result.fullName });
});
