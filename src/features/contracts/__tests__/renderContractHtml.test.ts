import { describe, expect, it } from 'vitest';
import { renderContractHtml, type JsonNode, type PartyLike } from '../editor/renderContractHtml';

const parties: PartyLike[] = [
  { id: 'p1', role_label: 'الطرف الأول', full_name: 'أحمد المطيري', national_id: '1234567890', email: 'a@x.com', phone: '0500000000' },
];

describe('renderContractHtml', () => {
  it('يستبدل حقل الدمج باسم الطرف الفعلي', () => {
    const doc: JsonNode = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'الطرف الأول هو ' },
            { type: 'mergeField', attrs: { partyId: 'p1', fieldKey: 'full_name' } },
          ],
        },
      ],
    };
    const html = renderContractHtml(doc, parties);
    expect(html).toContain('أحمد المطيري');
  });

  it('يعرض عنصرًا نائبًا لحقل التعبئة غير المُعبَّأ بعد', () => {
    const doc: JsonNode = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'fillField', attrs: { anchorId: 'f1', label: 'توقيع' } }],
        },
      ],
    };
    const html = renderContractHtml(doc, parties);
    expect(html).toContain('[توقيع]');
  });

  it('يستبدل حقل التعبئة النصي بالقيمة المُدخلة فعليًا', () => {
    const doc: JsonNode = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'fillField', attrs: { anchorId: 'f1', label: 'تاريخ', fieldType: 'date' } }],
        },
      ],
    };
    const html = renderContractHtml(doc, parties, { f1: { fieldType: 'date', value: '2026-07-09' } });
    expect(html).toContain('2026-07-09');
    expect(html).not.toContain('[تاريخ]');
  });

  it('يهرب وسوم HTML داخل النصوص لمنع الحقن', () => {
    const doc: JsonNode = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '<script>alert(1)</script>' }] }],
    };
    const html = renderContractHtml(doc, parties);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
