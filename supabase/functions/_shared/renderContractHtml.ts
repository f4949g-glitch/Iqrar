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
}

type MergeKey = 'full_name' | 'role_label' | 'national_id' | 'email' | 'phone';

function escapeHtml(s: string): string {
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
