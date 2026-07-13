import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/email.ts';
import { sendSms } from '../_shared/sms.ts';
import { renderSmsTemplate } from '../_shared/templates.ts';
import { generateFinalPdf, type FieldToRender, type PartyForVerificationPage } from '../_shared/generateFinalPdf.ts';
import {
  renderContractHtml,
  renderPartiesHeaderHtml,
  renderSignatureBlockHtml,
  renderTermLineHtml,
  escapeHtml,
  type FillValue,
  type SignatureFieldLike,
  type JsonNode,
} from '../_shared/renderContractHtml.ts';
import { generateVerificationNumber, generateQrPngBytes, renderVerificationFooterHtml } from '../_shared/verification.ts';

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

const IMAGE_FIELD_TYPES = new Set(['signature', 'image', 'logo', 'stamp']);

// يُعيد نوع MIME الفعلي مع البايتات بدل افتراض PNG دائمًا — الحقول القابلة للرفع
// (شعار/ختم) غالبًا JPEG من كاميرا الجوال، وتخزينها بامتداد/نوع محتوى PNG خاطئ
// كان يجعل embedPng في generateFinalPdf.ts يفشل بصمت عند توليد المستند النهائي.
function decodeDataUrl(dataUrl: string): { bytes: Uint8Array; mimeType: string } {
  const match = /^data:([^;,]+)?(;base64)?,/.exec(dataUrl);
  const mimeType = match?.[1] || 'image/png';
  const base64 = dataUrl.split(',')[1] ?? dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, mimeType };
}

const IMAGE_EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
};

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
  const action = body.action === 'reject' ? 'reject' : 'sign';
  const reason = String(body.reason ?? '').trim();
  if (!token) return jsonResponse({ error: 'رابط غير صالح' }, 400);

  // أثر تدقيق التوقيع: عنوان IP ومعلومات المتصفح/الجهاز وقت التوقيع، لتقوية
  // الحجية القانونية للتوثيق الإلكتروني إلى جانب رقم الهوية ووقت التوقيع.
  const clientIp = (req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip') ?? '').split(',')[0].trim() || null;
  const userAgent = req.headers.get('user-agent') || null;

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: party, error: partyError } = await admin.from('contract_parties').select('*').eq('token', token).maybeSingle();
  if (partyError || !party) return jsonResponse({ error: 'الرابط غير صالح أو منتهي' }, 404);
  if (party.status === 'signed') return jsonResponse({ error: 'تم توقيع هذا الإقرار بالفعل' }, 400);

  const { data: contract, error: contractError } = await admin.from('contracts').select('*').eq('id', party.contract_id).single();
  if (contractError || !contract) return jsonResponse({ error: 'العقد غير موجود' }, 404);
  if (!['pending', 'partially_completed'].includes(contract.status)) {
    return jsonResponse({ error: 'هذا العقد لم يعد قابلًا للتوقيع' }, 400);
  }

  // ترتيب توقيع إلزامي: فحص خادمي مستقل عن بوابة get-signing-session، وإلا
  // أمكن تجاوزها بإرسال هذا الطلب مباشرة بتوكن طرف لم يحن دوره بعد.
  if (contract.sequential_signing) {
    const { data: earlierParties } = await admin
      .from('contract_parties')
      .select('status')
      .eq('contract_id', contract.id)
      .lt('order_index', party.order_index);
    if ((earlierParties ?? []).some((p) => p.status !== 'signed')) {
      return jsonResponse({ error: 'بانتظار توقيع الطرف الذي يسبقك في الترتيب' }, 403);
    }
  }

  if (action === 'reject') {
    await admin.from('contract_parties').update({ status: 'rejected' }).eq('id', party.id);
    await admin
      .from('contracts')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', contract.id);
    await admin.from('contract_events').insert({
      contract_id: contract.id,
      party_id: party.id,
      event_type: 'party_rejected',
      message: reason ? `رفض ${party.full_name} العقد: ${reason}` : `رفض ${party.full_name} العقد`,
    });
    return jsonResponse({ success: true });
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
      const { bytes, mimeType } = decodeDataUrl(raw);
      const extension = IMAGE_EXTENSION_BY_MIME[mimeType] ?? 'png';
      const path = `${contract.id}/fields/${field.id}.${extension}`;
      const { error: uploadError } = await admin.storage.from('contracts').upload(path, bytes, {
        upsert: true,
        contentType: mimeType,
      });
      if (uploadError) return jsonResponse({ error: 'تعذّر رفع أحد الحقول' }, 500);
      storedValue = { path };
    }

    await admin.from('contract_fields').update({ value: storedValue, filled_at: new Date().toISOString() }).eq('id', field.id);
  }

  await admin
    .from('contract_parties')
    .update({ status: 'signed', signed_at: new Date().toISOString(), signed_ip: clientIp, signed_user_agent: userAgent })
    .eq('id', party.id);
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

  const verificationNumber = await generateVerificationNumber(async (candidate) => {
    const { data } = await admin.from('contracts').select('id').eq('verification_number', candidate).maybeSingle();
    return Boolean(data);
  });
  contract.verification_number = verificationNumber;

  const finalized = contract.source_type === 'editor' ? await finalizeEditorContract(admin, contract) : await finalizePdfContract(admin, contract);

  if (!finalized) {
    // فشل التوثيق النهائي (مثلًا عقد PDF أُرسل دون رفع ملف، أو تعذّر تحميل الملف
    // من التخزين) — لا نُرسل إشعارات "اكتمل التوثيق" الكاذبة، ونسجّل الخلل ليراجعه
    // الأدمن بدل ترك العقد عالقًا بصمت عند حالة "مكتمل جزئيًا".
    await admin.from('contract_events').insert({
      contract_id: contractId,
      event_type: 'completion_failed',
      message: 'وقّع جميع الأطراف لكن تعذّر إتمام توثيق العقد نهائيًا (تحقّق من وجود محتوى العقد)، يلزم تدخّل الأدمن',
    });
    return;
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
      const completionText = await renderSmsTemplate(
        admin,
        'completion',
        { title: String(contract.title ?? ''), verification_number: String(contract.verification_number ?? '') },
        `نفيدكم بأنه تم توثيق "${contract.title}" بنجاح عبر منصة إقرار. رقم التوثيق: ${contract.verification_number ?? ''}`,
      );
      await sendSms(p.phone, completionText);
    }
  }
}

// عرض مبسّط (لاتيني فقط) لمتصفح ونظام تشغيل الطرف من User-Agent الخام؛ خطوط PDF
// القياسية المستخدمة هنا لا تدعم عرض العربية (انظر الملاحظة في generateFinalPdf.ts).
function briefUserAgentLatin(ua: string | null): string | null {
  if (!ua) return null;
  let os = '';
  if (/iphone/i.test(ua)) os = 'iPhone';
  else if (/ipad/i.test(ua)) os = 'iPad';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac os/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = '';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/crios\//i.test(ua) || (/chrome\//i.test(ua) && !/chromium/i.test(ua))) browser = 'Chrome';
  else if (/fxios\//i.test(ua) || /firefox\//i.test(ua)) browser = 'Firefox';
  else if (/safari\//i.test(ua)) browser = 'Safari';

  return [browser, os].filter(Boolean).join(' / ') || null;
}

// deno-lint-ignore no-explicit-any
async function finalizePdfContract(admin: ReturnType<typeof createClient>, contract: any): Promise<boolean> {
  if (!contract.original_file_path) return false;

  const [{ data: allFields }, { data: partiesForAudit }] = await Promise.all([
    admin.from('contract_fields').select('*').eq('contract_id', contract.id),
    admin
      .from('contract_parties')
      .select('order_index, signed_ip, signed_user_agent, signed_at, role_label, full_name, national_id, party_type, entity_name, status')
      .eq('contract_id', contract.id)
      .order('order_index', { ascending: true }),
  ]);
  const { data: originalFile } = await admin.storage.from('contracts').download(contract.original_file_path);
  if (!originalFile) return false;

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

  const completedAt = new Date().toISOString();
  const verificationStamp = contract.verification_number
    ? {
        number: contract.verification_number,
        dateLabel: completedAt.slice(0, 10),
        qrPngBytes: await generateQrPngBytes(contract.verification_number),
      }
    : undefined;

  const signerAudits = (partiesForAudit ?? [])
    .filter((p) => p.signed_at)
    .map((p) => ({
      partyIndex: (p.order_index as number) + 1,
      ip: p.signed_ip as string | null,
      userAgentLabel: briefUserAgentLatin(p.signed_user_agent as string | null),
      signedAtLabel: p.signed_at ? new Date(p.signed_at as string).toISOString() : null,
    }));

  // بيانات الأطراف كاملة لصفحة التوثيق الجديدة المُلحَقة بنهاية المستند (اسم
  // المنشأة بدل اسم الشخص لأطراف المنشآت، وبالعربية الصحيحة عبر arabicShaper.ts).
  const partiesForVerificationPage: PartyForVerificationPage[] = (partiesForAudit ?? []).map((p) => ({
    orderIndex: (p.order_index as number) + 1,
    roleLabel: String(p.role_label ?? ''),
    fullName: p.party_type === 'company' ? String(p.entity_name ?? p.full_name ?? '') : String(p.full_name ?? ''),
    nationalId: (p.national_id as string | null) ?? null,
    status: String(p.status ?? ''),
    signedAtLabel: p.signed_at ? new Date(p.signed_at as string).toISOString().slice(0, 16).replace('T', ' ') : null,
  }));

  let companyLogoBytes: Uint8Array | null = null;
  if (contract.company_logo_path) {
    const { data: logoFile } = await admin.storage.from('contracts').download(contract.company_logo_path);
    if (logoFile) companyLogoBytes = new Uint8Array(await logoFile.arrayBuffer());
  }

  const finalBytes = await generateFinalPdf(
    originalBytes,
    fieldsToRender,
    async (path) => {
      const { data } = await admin.storage.from('contracts').download(path);
      if (!data) throw new Error(`تعذّر تحميل ${path}`);
      return new Uint8Array(await data.arrayBuffer());
    },
    verificationStamp,
    signerAudits,
    companyLogoBytes,
    partiesForVerificationPage,
    String(contract.title ?? ''),
  );

  const finalPath = `${contract.id}/final.pdf`;
  await admin.storage.from('contracts').upload(finalPath, finalBytes, { upsert: true, contentType: 'application/pdf' });

  await admin
    .from('contracts')
    .update({
      status: 'completed',
      final_file_path: finalPath,
      verification_number: contract.verification_number,
      completed_at: completedAt,
      updated_at: completedAt,
    })
    .eq('id', contract.id);
  return true;
}

// deno-lint-ignore no-explicit-any
async function finalizeEditorContract(admin: ReturnType<typeof createClient>, contract: any): Promise<boolean> {
  if (!contract.body_json) return false;

  const [{ data: parties }, { data: allFields }] = await Promise.all([
    admin
      .from('contract_parties')
      .select('id, role_label, full_name, national_id, email, phone, verification_method, signed_at, signed_ip, signed_user_agent')
      .eq('contract_id', contract.id),
    admin.from('contract_fields').select('*').eq('contract_id', contract.id),
  ]);

  const fillValues: Record<string, FillValue> = {};
  const unanchoredFields: SignatureFieldLike[] = [];
  for (const f of allFields ?? []) {
    const isImage = ['signature', 'image', 'logo', 'stamp'].includes(f.field_type);
    let resolvedImageUrl: string | undefined;
    if (isImage && f.value && typeof f.value === 'object' && 'path' in (f.value as Record<string, unknown>)) {
      const path = (f.value as { path: string }).path;
      const { data: signed } = await admin.storage.from('contracts').createSignedUrl(path, 60 * 60 * 24 * 365);
      resolvedImageUrl = signed?.signedUrl;
    }
    if (f.anchor_id) {
      fillValues[f.anchor_id] = { fieldType: f.field_type, value: f.value, resolvedImageUrl };
    } else {
      unanchoredFields.push({ party_id: f.party_id, field_type: f.field_type, label: f.label, value: f.value, resolvedImageUrl });
    }
  }

  const completedAt = new Date().toISOString();
  const verificationFooter = contract.verification_number
    ? await renderVerificationFooterHtml(contract.verification_number, completedAt)
    : '';

  // شعار المنشأة (اختياري): يُدرَج بارزًا كترويسة أعلى المستند النهائي.
  let logoHtml = '';
  if (contract.company_logo_path) {
    const { data: signed } = await admin.storage.from('contracts').createSignedUrl(contract.company_logo_path, 60 * 60 * 24 * 365);
    if (signed?.signedUrl) {
      logoHtml = `<div class="company-logo"><img src="${signed.signedUrl}" alt="شعار المنشأة" /></div>`;
    }
  }

  const html =
    logoHtml +
    `<h1 class="contract-title">${escapeHtml(String(contract.title ?? ''))}</h1>` +
    renderTermLineHtml(contract) +
    renderPartiesHeaderHtml(parties ?? []) +
    renderContractHtml(contract.body_json as JsonNode, parties ?? [], fillValues) +
    renderSignatureBlockHtml(unanchoredFields, parties ?? []) +
    verificationFooter;

  await admin
    .from('contracts')
    .update({
      status: 'completed',
      final_html: html,
      verification_number: contract.verification_number,
      completed_at: completedAt,
      updated_at: completedAt,
    })
    .eq('id', contract.id);
  return true;
}
