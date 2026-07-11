import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import QRCode from 'npm:qrcode@1.5.4';
import { corsHeaders } from '../_shared/cors.ts';
import { buildVerifyUrl } from '../_shared/verification.ts';

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// نفس تسميات الحالة المستخدمة في ContractDetailPage.tsx (PARTY_STATUS_LABEL).
const PARTY_STATUS_LABEL: Record<string, string> = {
  pending: 'بانتظار التوقيع',
  viewed: 'تمت المشاهدة',
  signed: 'وقّع',
  rejected: 'مرفوض',
};

const DOCUMENT_TYPE_LABEL: Record<string, string> = {
  contract: 'عقد',
  power_of_attorney: 'تفويض',
};

// نفس تنسيق PRINT_STYLES في ContractDetailPage.tsx كي تتطابق طباعة صفحة
// إعادة الطباعة مع طباعة العقود المكتملة العادية.
const PRINT_STYLES = `
  body { font-family: 'Tajawal', 'Arial', sans-serif; color: #000; padding: 32px; line-height: 1.8; }
  h1.doc-title { font-size: 22px; margin-bottom: 4px; }
  p.doc-sub { font-size: 13px; color: #555; margin-bottom: 20px; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 13px; }
  th, td { border: 1px solid #999; padding: 6px 10px; text-align: right; color: #000; }
  th { background: #f0f0f0; }
  .verification-footer { display: flex; align-items: center; gap: 16px; margin-top: 24px; padding: 12px 16px; border: 1px solid #999; border-radius: 12px; }
  .verification-qr svg { width: 110px; height: 110px; }
  .verification-info p { margin: 2px 0; font-size: 12px; }
`;

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

  const verificationNumber = String(body.verification_number ?? '').trim();
  if (!verificationNumber) return jsonResponse({ error: 'رقم التوثيق مطلوب' }, 400);

  const { data: contract } = await admin
    .from('contracts')
    .select('id, title, document_type, verification_number, completed_at, status')
    .eq('verification_number', verificationNumber)
    .maybeSingle();

  if (!contract) return jsonResponse({ error: 'لا يوجد عقد أو تفويض بهذا رقم التوثيق' }, 404);
  if (contract.status !== 'completed') return jsonResponse({ error: 'هذه الوثيقة لم يكتمل توثيقها بعد' }, 409);

  const { data: parties } = await admin
    .from('contract_parties')
    .select('order_index, role_label, full_name, national_id, phone, party_type, entity_name, status, signed_at')
    .eq('contract_id', contract.id)
    .order('order_index', { ascending: true });

  const url = buildVerifyUrl(verificationNumber);
  const qrSvg = await QRCode.toString(url, { type: 'svg', margin: 1, width: 110 });
  const dateLabel = contract.completed_at ? new Date(contract.completed_at).toLocaleDateString('ar-SA-u-ca-gregory') : '—';
  const docTypeLabel = DOCUMENT_TYPE_LABEL[contract.document_type as string] ?? contract.document_type;

  const rows = (parties ?? [])
    .map((p) => {
      const name = p.party_type === 'company' ? (p.entity_name ?? p.full_name ?? '') : (p.full_name ?? '');
      const statusLabel = PARTY_STATUS_LABEL[p.status as string] ?? p.status;
      const signedAt = p.signed_at ? new Date(p.signed_at as string).toLocaleString('ar-SA-u-ca-gregory') : '—';
      return `<tr>
        <td>${escapeHtml(String((p.order_index as number) + 1))}</td>
        <td>${escapeHtml(String(p.role_label ?? ''))}</td>
        <td>${escapeHtml(String(name))}</td>
        <td>${escapeHtml(String(p.national_id ?? '—'))}</td>
        <td>${escapeHtml(String(p.phone ?? '—'))}</td>
        <td>${escapeHtml(String(statusLabel))}</td>
        <td>${escapeHtml(signedAt)}</td>
      </tr>`;
    })
    .join('');

  const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${escapeHtml(String(contract.title ?? ''))}</title><style>${PRINT_STYLES}</style></head><body>
    <h1 class="doc-title">${escapeHtml(String(contract.title ?? ''))}</h1>
    <p class="doc-sub">إعادة طباعة معلومات توثيق ${escapeHtml(docTypeLabel as string)} — تم إنشاء هذه الصفحة يدويًا من لوحة تحكم الإدارة</p>
    <table>
      <thead><tr><th>#</th><th>الدور</th><th>الاسم</th><th>رقم الهوية</th><th>الجوال</th><th>الحالة</th><th>وقت التوقيع</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="verification-footer">
      <div class="verification-qr">${qrSvg}</div>
      <div class="verification-info">
        <p>رقم التوثيق: <strong>${escapeHtml(verificationNumber)}</strong></p>
        <p>تاريخ التوثيق: <strong>${escapeHtml(dateLabel)}</strong></p>
        <p>امسح الرمز أو زر صفحة التحقق للتأكد من صحة هذه الوثيقة</p>
      </div>
    </div>
  </body></html>`;

  return jsonResponse({ html, title: String(contract.title ?? '') });
});

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
