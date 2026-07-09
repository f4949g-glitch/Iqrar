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

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: party, error: partyError } = await admin
    .from('contract_parties')
    .select('id, contract_id, role_label, full_name, status')
    .eq('token', token)
    .maybeSingle();

  if (partyError || !party) return jsonResponse({ error: 'الرابط غير صالح أو منتهي' }, 404);

  const { data: contract, error: contractError } = await admin
    .from('contracts')
    .select('id, title, status, page_count, original_file_path, source_type, body_json')
    .eq('id', party.contract_id)
    .single();

  if (contractError || !contract) return jsonResponse({ error: 'العقد غير موجود' }, 404);

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

  let allParties: unknown[] | null = null;
  if (contract.source_type === 'editor') {
    const { data } = await admin
      .from('contract_parties')
      .select('id, role_label, full_name, national_id, email, phone')
      .eq('contract_id', contract.id);
    allParties = data ?? [];
  }

  return jsonResponse({
    contract: {
      id: contract.id,
      title: contract.title,
      status: contract.status,
      page_count: contract.page_count,
      source_type: contract.source_type,
      body_json: contract.source_type === 'editor' ? contract.body_json : null,
    },
    party: { id: party.id, role_label: party.role_label, full_name: party.full_name, status: party.status },
    fields,
    pdf_url: pdfUrl,
    all_parties: allParties,
  });
});
