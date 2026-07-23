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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'بيانات غير صالحة' }, 400);
  }

  const token = String(body.token ?? '').trim();
  if (!token) return jsonResponse({ error: 'رابط غير صالح' }, 400);
  const sessionId = String(body.session_id ?? '').trim();

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: party, error: partyError } = await admin
    .from('contract_parties')
    .select('id, contract_id, role_label, full_name, status, national_id, verification_method, order_index')
    .eq('token', token)
    .maybeSingle();

  if (partyError || !party) return jsonResponse({ error: 'الرابط غير صالح أو منتهي' }, 404);

  // طرف بطريقة "يدوي" يجب أن يتحقق من هويته برمز SMS (انظر
  // request-signing-identity-otp/verify-signing-identity-otp) قبل رؤية أي جزء
  // من محتوى العقد — طرف نفاذ معفى لأنه تحقَّق أصلًا عبر النظام الحكومي.
  // التحقق مربوط بمعرِّف الجلسة (session_id) المُرسَل من المتصفح لا بالطرف
  // وحده: فتح الرابط من جديد (تبويب جديد/متصفح آخر بعد إغلاق التبويب السابق)
  // يعني معرِّف جلسة مختلف أو غائب، فيُعامَل التحقق كغير سارٍ ويُطلَب رمز جديد،
  // بدل بقاء "verified" ساريًا للأبد بمجرد نجاحه مرة واحدة.
  if (party.verification_method === 'manual') {
    const { data: identityOtpRows } = await admin.rpc('rpc_get_signing_identity_otp', { p_party_id: party.id });
    const identityRow = identityOtpRows?.[0];
    const identityVerified = Boolean(identityRow?.verified) && Boolean(sessionId) && identityRow?.session_id === sessionId;
    if (!identityVerified) {
      return jsonResponse({
        party: { id: party.id, role_label: party.role_label, full_name: party.full_name, verification_method: party.verification_method },
        otp_required: true,
      });
    }
  }

  // إن كان صاحب هذا الطرف (بمطابقة رقم الهوية) قد حفظ توقيعًا في ملفه الشخصي من
  // قبل، يُتاح له مباشرة بلا رمز تحقق إضافي — هويته أصلًا مُتحقَّق منها للوصول
  // لهذه النقطة (رمز SMS لبوابة فتح الرابط لطرف "يدوي"، أو نفاذ الحكومي لطرف
  // "نفاذ")، فطلب رمز SMS ثانٍ خاص بالتوقيع المحفوظ تحقق مكرِّر لا داعي له.
  let savedSignatureDataUrl: string | null = null;
  if (party.national_id) {
    const { data: ownerProfile } = await admin.from('profiles').select('signature_data_url').eq('national_id', party.national_id).maybeSingle();
    savedSignatureDataUrl = ownerProfile?.signature_data_url ?? null;
  }

  const { data: contract, error: contractError } = await admin
    .from('contracts')
    .select('id, title, status, page_count, original_file_path, source_type, body_json, sequential_signing, expires_at')
    .eq('id', party.contract_id)
    .single();

  if (contractError || !contract) return jsonResponse({ error: 'العقد غير موجود' }, 404);

  // انتهت مدة صلاحية التوثيق: يُنقَل العقد لحالة "منتهي" فورًا (بدل انتظار
  // الوظيفة المجدولة كل 15 دقيقة) ويُمنع أي طرف من رؤية المحتوى أو التوقيع.
  if (['pending', 'partially_completed'].includes(contract.status) && contract.expires_at && new Date(contract.expires_at) < new Date()) {
    await admin.from('contracts').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', contract.id);
    return jsonResponse({ error: 'انتهت مدة صلاحية توثيق هذا العقد ولم يعد قابلًا للتوقيع' }, 410);
  }

  // ترتيب توقيع إلزامي: طرف لا يرى المحتوى إلا بعد توقيع كل من يسبقه بحسب
  // order_index — يمنع مثلًا موظفًا يوقّع بعد البائع من التوقيع قبله.
  if (contract.sequential_signing) {
    const { data: earlierParties } = await admin
      .from('contract_parties')
      .select('status')
      .eq('contract_id', contract.id)
      .lt('order_index', party.order_index);
    const waitingForTurn = (earlierParties ?? []).some((p) => p.status !== 'signed');
    if (waitingForTurn) {
      return jsonResponse({
        party: { id: party.id, role_label: party.role_label, full_name: party.full_name },
        waiting_for_turn: true,
      });
    }
  }

  if (party.status === 'pending') {
    await admin.from('contract_parties').update({ status: 'viewed' }).eq('id', party.id);
    await admin
      .from('contract_events')
      .insert({ contract_id: contract.id, party_id: party.id, event_type: 'viewed', message: `${party.full_name} فتح رابط التوقيع` });
  }

  const { data: fields, error: fieldsError } = await admin
    .from('contract_fields')
    .select('*')
    .eq('party_id', party.id)
    .order('page_number', { ascending: true });

  if (fieldsError) return jsonResponse({ error: 'تعذّر تحميل حقول العقد' }, 500);

  let pdfUrl: string | null = null;
  if (contract.original_file_path) {
    const { data: signed } = await admin.storage.from('contracts').createSignedUrl(contract.original_file_path, 3600);
    pdfUrl = signed?.signedUrl ?? null;
  }

  // بيانات كل أطراف العقد (اسم/صفة) تُعرَض لكل طرف موقِّع مهما كان نوع مصدر
  // العقد (محرر أو PDF)، بدل الاقتصار على الأطراف عبر المحرر فقط.
  const { data: allPartiesData } = await admin
    .from('contract_parties')
    .select('id, role_label, full_name, national_id, email, phone')
    .eq('contract_id', contract.id);
  const allParties = allPartiesData ?? [];

  return jsonResponse({
    contract: {
      id: contract.id,
      title: contract.title,
      status: contract.status,
      page_count: contract.page_count,
      source_type: contract.source_type,
      body_json: contract.source_type === 'editor' ? contract.body_json : null,
    },
    party: { id: party.id, role_label: party.role_label, full_name: party.full_name, status: party.status, saved_signature_data_url: savedSignatureDataUrl },
    fields,
    pdf_url: pdfUrl,
    all_parties: allParties,
  });
});
