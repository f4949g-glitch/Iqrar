// نسخة مطابقة لـ src/features/contracts/editor/renderContractHtml.ts، مكرَّرة هنا
// لأن Edge Functions تُنشر كملفات مستقلة (بلا bundler مشترك مع تطبيق العميل).

export interface JsonNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: JsonNode[];
  text?: string;
  marks?: { type: string }[];
}

export interface PartyLike {
  id: string;
  role_label: string;
  full_name: string;
  national_id: string | null;
  email: string | null;
  phone: string | null;
  verification_method?: string;
}

type MergeKey = 'full_name' | 'role_label' | 'national_id' | 'email' | 'phone';

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function resolvePartyValue(party: PartyLike | undefined, key: MergeKey): string {
  if (!party) return '';
  return party[key] ?? '';
}

function renderMarks(text: string, marks: { type: string }[] = []): string {
  let html = escapeHtml(text);
  for (const mark of marks) {
    if (mark.type === 'bold') html = `<strong>${html}</strong>`;
    if (mark.type === 'italic') html = `<em>${html}</em>`;
    if (mark.type === 'underline') html = `<u>${html}</u>`;
    if (mark.type === 'strike') html = `<s>${html}</s>`;
  }
  return html;
}

export interface FillValue {
  fieldType: string;
  value: unknown;
  resolvedImageUrl?: string;
}

export function renderContractHtml(doc: JsonNode, parties: PartyLike[], fillValues: Record<string, FillValue> = {}): string {
  const partyById = new Map(parties.map((p) => [p.id, p]));

  function renderNode(node: JsonNode): string {
    const children = () => (node.content ?? []).map(renderNode).join('');

    switch (node.type) {
      case 'doc':
        return children();
      case 'paragraph':
        return `<p>${children()}</p>`;
      case 'heading': {
        const level = Number(node.attrs?.level ?? 1);
        return `<h${level}>${children()}</h${level}>`;
      }
      case 'bulletList':
        return `<ul>${children()}</ul>`;
      case 'orderedList':
        return `<ol>${children()}</ol>`;
      case 'listItem':
        return `<li>${children()}</li>`;
      case 'blockquote':
        return `<blockquote>${children()}</blockquote>`;
      case 'horizontalRule':
        return '<hr/>';
      case 'hardBreak':
        return '<br/>';
      case 'table':
        return `<table>${children()}</table>`;
      case 'tableRow':
        return `<tr>${children()}</tr>`;
      case 'tableCell':
        return `<td>${children()}</td>`;
      case 'tableHeader':
        return `<th>${children()}</th>`;
      case 'text':
        return renderMarks(node.text ?? '', node.marks);
      case 'mergeField': {
        const partyId = String(node.attrs?.partyId ?? '');
        const fieldKey = String(node.attrs?.fieldKey ?? 'full_name') as MergeKey;
        const value = resolvePartyValue(partyById.get(partyId), fieldKey);
        return `<span class="merge-value">${escapeHtml(value || '—')}</span>`;
      }
      case 'fillField': {
        const anchorId = String(node.attrs?.anchorId ?? '');
        const label = String(node.attrs?.label ?? '');
        const fillValue = fillValues[anchorId];
        if (!fillValue || fillValue.value == null || fillValue.value === '') {
          return `<span class="fill-placeholder">[${escapeHtml(label)}]</span>`;
        }
        if (fillValue.resolvedImageUrl) {
          return `<img class="fill-image" src="${fillValue.resolvedImageUrl}" alt="${escapeHtml(label)}" />`;
        }
        if (fillValue.fieldType === 'checkbox') {
          return fillValue.value === true ? '☑' : '☐';
        }
        return `<span class="fill-value">${escapeHtml(String(fillValue.value))}</span>`;
      }
      default:
        return children();
    }
  }

  return renderNode(doc);
}

const VERIFICATION_LABEL: Record<string, string> = {
  nafath: 'تم التحقق من الهوية عبر خدمة نفاذ الحكومية',
  manual: 'تم التوقيع إلكترونيًا عبر منصة إقرار',
};

// جدول تعريفي بأطراف العقد يُدرَج في بداية المستند النهائي (اسم/هوية/جوال/صفة لكل طرف)،
// بصرف النظر عمّا إذا أدرج كاتب العقد حقول دمج مطابقة يدويًا داخل النص.
export function renderPartiesHeaderHtml(parties: PartyLike[]): string {
  if (parties.length === 0) return '';
  const rows = parties
    .map(
      (p) =>
        `<tr><td>${escapeHtml(p.full_name || '—')}</td><td>${escapeHtml(p.national_id || '—')}</td><td>${escapeHtml(p.phone || '—')}</td><td>${escapeHtml(p.role_label)}</td></tr>`,
    )
    .join('');
  return `<div class="parties-header"><h3>أطراف العقد</h3><table class="parties-table"><thead><tr><th>الاسم</th><th>رقم الهوية</th><th>الجوال</th><th>الصفة</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

const TERM_UNIT_LABEL: Record<string, string> = { day: 'يوم', week: 'أسبوع', month: 'شهر', year: 'سنة' };

export interface TermLike {
  term_value: number | null;
  term_unit: string | null;
  term_end_date: string | null;
}

// سطر تعريفي بمدة سريان العقد (اختياري) يُدرَج بعد عنوان العقد مباشرة إن كان
// منشئ العقد قد حدّدها — إما كمدة نسبية (قيمة + وحدة) أو تاريخ انتهاء محدد.
export function renderTermLineHtml(contract: TermLike): string {
  if (contract.term_value && contract.term_unit) {
    return `<p class="contract-term">مدة سريان العقد: ${contract.term_value} ${TERM_UNIT_LABEL[contract.term_unit] ?? contract.term_unit}</p>`;
  }
  if (contract.term_end_date) {
    return `<p class="contract-term">مدة سريان العقد: حتى ${escapeHtml(contract.term_end_date)}</p>`;
  }
  return '';
}

export interface SignatureFieldLike {
  party_id: string;
  field_type: string;
  label: string;
  value: unknown;
  resolvedImageUrl?: string;
}

// يُلحَق بنهاية المستند النهائي: كل حقل لم يُدرَج له موضع صريح داخل النص (كحقل التوقيع
// المُنشأ تلقائيًا لكل طرف) — كي لا يُفقَد التوقيع من المستند النهائي لمجرد أن كاتب
// العقد لم يضع مرساة "حقل تعبئة" يدويًا في مكانه من النص.
export function renderSignatureBlockHtml(fields: SignatureFieldLike[], parties: PartyLike[]): string {
  if (fields.length === 0) return '';
  const partyById = new Map(parties.map((p) => [p.id, p]));
  const rows = fields
    .map((f) => {
      const party = partyById.get(f.party_id);
      const name = escapeHtml(party?.full_name || '—');
      const role = escapeHtml(party?.role_label ?? '');
      const method = party ? (VERIFICATION_LABEL[(party as unknown as { verification_method?: string }).verification_method ?? 'manual'] ?? VERIFICATION_LABEL.manual) : '';
      let valueHtml: string;
      if (f.resolvedImageUrl) {
        valueHtml = `<img class="fill-image" src="${f.resolvedImageUrl}" alt="${escapeHtml(f.label)}" style="max-height:70px" />`;
      } else if (f.value == null || f.value === '') {
        valueHtml = '—';
      } else {
        valueHtml = escapeHtml(String(f.value));
      }
      return `<tr><td>${name}</td><td>${role}</td><td>${escapeHtml(f.label)}</td><td>${valueHtml}</td><td>${escapeHtml(method)}</td></tr>`;
    })
    .join('');
  return `<div class="signatures-section"><h3>توقيعات الأطراف</h3><table class="signatures-table"><thead><tr><th>الاسم</th><th>الصفة</th><th>الحقل</th><th>القيمة</th><th>طريقة التوثيق</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
