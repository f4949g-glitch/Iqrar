import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/email.ts';
import { sendSms } from '../_shared/sms.ts';
import { generateFinalPdf, type FieldToRender } from '../_shared/generateFinalPdf.ts';
import { renderContractHtml, type FillValue, type JsonNode } from '../_shared/renderContractHtml.ts';

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

const IMAGE_FIELD_TYPES = new Set(['signature', 'image', 'logo', 'stamp']);

function decodeDataUrl(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] ?? dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
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
  const values = (body.values ?? {}) as Record<string, unknown>;
  if (!token) return jsonResponse({ error: 'رابط غير صالح' }, 400);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: party, error: partyError } = await admin.from('contract_parties').select('*').eq('token', token).maybeSingle();
  if (partyError || !party) return jsonResponse({ error: 'الرابط غير صالح أو منتهي' }, 404);
  if (party.status === 'signed') return jsonResponse({ error: 'تم توقيع هذا الإقرار بالفعل' }, 400);

  const { data: contract, error: contractError } = await admin.from('contracts').select('*').eq('id', party.contract_id).single();
  if (contractError || !contract) return jsonResponse({ error: 'العقد غير موجود' }, 404);
  if (!['pending', 'partially_completed'].includes(contract.status)) {
    return jsonResponse({ error: 'هذا العقد لم يعد قابلًا للتوقيع' }, 400);
  }

  const { data: fields, error: fieldsError } = await admin.from('contract_fields').select('*').eq('party_id', party.id);
  if (fieldsError) return jsonResponse({ error: 'تعذّر تحميل حقول العقد' }, 500);

  for (const field of fields ?? []) {
    if (field.required && (values[field.id] === undefined || values[field.id] === null || values[field.id] === '')) {
      return jsonResponse({ error: `الحقل "${field.label}" مطلوب` }, 400);
    }
  }

  for (const field of fields ?? []) {
    const raw = values[field.id];
    if (raw === undefined) continue;

    let storedValue: unknown = raw;
    if (IMAGE_FIELD_TYPES.has(field.field_type) && typeof raw === 'string' && raw.startsWith('data:')) {
      const bytes = decodeDataUrl(raw);
      const path = `${contract.id}/fields/${field.id}.png`;
      const { error: uploadError } = await admin.storage.from('contracts').upload(path, bytes, {
        upsert: true,
        contentType: 'image/png',
      });
      if (uploadError) return jsonResponse({ error: 'تعذّر رفع أحد الحقول' }, 500);
      storedValue = { path };
    }

    await admin.from('contract_fields').update({ value: storedValue, filled_at: new Date().toISOString() }).eq('id', field.id);
  }

  await admin.from('contract_parties').update({ status: 'signed', signed_at: new Date().toISOString() }).eq('id', party.id);
  await admin
    .from('contract_events')
    .insert({ contract_id: contract.id, party_id: party.id, event_type: 'party_signed', message: `وقّع ${party.full_name} على العقد` });

  const { data: allParties } = await admin.from('contract_parties').select('status').eq('contract_id', contract.id);
  const allSigned = (allParties ?? []).every((p) => p.status === 'signed');

  if (allSigned) {
    await finalizeContract(admin, contract.id);
  } else if (contract.status === 'pending') {
    await admin.from('contracts').update({ status: 'partially_completed', updated_at: new Date().toISOString() }).eq('id', contract.id);
  }

  return jsonResponse({ success: true, completed: allSigned });
});

async function finalizeContract(admin: ReturnType<typeof createClient>, contractId: string) {
  const { data: contract } = await admin.from('contracts').select('*').eq('id', contractId).single();
  if (!contract) return;

  if (contract.source_type === 'editor') {
    await finalizeEditorContract(admin, contract);
  } else {
    await finalizePdfContract(admin, contract);
  }

  await admin.from('contract_events').insert({ contract_id: contractId, event_type: 'completed', message: 'تم توثيق العقد بنجاح واكتمل توقيع جميع الأطراف' });

  const { data: parties } = await admin.from('contract_parties').select('full_name, email, phone').eq('contract_id', contractId);
  for (const p of parties ?? []) {
    if (p.email) {
      await sendEmail(
        p.email,
        'اكتمل توثيق العقد',
        `<p>مرحبًا ${p.full_name}،</p><p>نفيدكم بأنه تم توثيق العقد "${contract.title}" بنجاح عبر منصة إقرار لخدمات الأعمال.</p>`,
      );
    }
    if (p.phone) {
      await sendSms(p.phone, 'نفيدكم بأنه تم توثيق العقد بنجاح عبر منصة إقرار لخدمات الأعمال.');
    }
  }
}

// deno-lint-ignore no-explicit-any
async function finalizePdfContract(admin: ReturnType<typeof createClient>, contract: any) {
  if (!contract.original_file_path) return;

  const { data: allFields } = await admin.from('contract_fields').select('*').eq('contract_id', contract.id);
  const { data: originalFile } = await admin.storage.from('contracts').download(contract.original_file_path);
  if (!originalFile) return;

  const originalBytes = new Uint8Array(await originalFile.arrayBuffer());
  const fieldsToRender: FieldToRender[] = (allFields ?? []).map((f) => ({
    field_type: f.field_type,
    page_number: f.page_number,
    pos_x: Number(f.pos_x),
    pos_y: Number(f.pos_y),
    width: Number(f.width),
    height: Number(f.height),
    value: f.value,
  }));

  const finalBytes = await generateFinalPdf(originalBytes, fieldsToRender, async (path) => {
    const { data } = await admin.storage.from('contracts').download(path);
    if (!data) throw new Error(`تعذّر تحميل ${path}`);
    return new Uint8Array(await data.arrayBuffer());
  });

  const finalPath = `${contract.id}/final.pdf`;
  await admin.storage.from('contracts').upload(finalPath, finalBytes, { upsert: true, contentType: 'application/pdf' });

  await admin
    .from('contracts')
    .update({ status: 'completed', final_file_path: finalPath, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', contract.id);
}

// deno-lint-ignore no-explicit-any
async function finalizeEditorContract(admin: ReturnType<typeof createClient>, contract: any) {
  if (!contract.body_json) return;

  const [{ data: parties }, { data: allFields }] = await Promise.all([
    admin.from('contract_parties').select('id, role_label, full_name, national_id, email, phone').eq('contract_id', contract.id),
    admin.from('contract_fields').select('*').eq('contract_id', contract.id),
  ]);

  const fillValues: Record<string, FillValue> = {};
  for (const f of allFields ?? []) {
    if (!f.anchor_id) continue;
    const isImage = ['signature', 'image', 'logo', 'stamp'].includes(f.field_type);
    if (isImage && f.value && typeof f.value === 'object' && 'path' in (f.value as Record<string, unknown>)) {
      const path = (f.value as { path: string }).path;
      const { data: signed } = await admin.storage.from('contracts').createSignedUrl(path, 60 * 60 * 24 * 365);
      fillValues[f.anchor_id] = { fieldType: f.field_type, value: f.value, resolvedImageUrl: signed?.signedUrl };
    } else {
      fillValues[f.anchor_id] = { fieldType: f.field_type, value: f.value };
    }
  }

  const html = renderContractHtml(contract.body_json as JsonNode, parties ?? [], fillValues);

  await admin
    .from('contracts')
    .update({ status: 'completed', final_html: html, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', contract.id);
}
