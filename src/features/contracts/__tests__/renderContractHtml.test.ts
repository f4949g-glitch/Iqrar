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

  it('يطبّق محاذاة/توسيط الفقرات والعناوين المحدَّدة في المحرر', () => {
    const doc: JsonNode = {
      type: 'doc',
      content: [
        { type: 'paragraph', attrs: { textAlign: 'center' }, content: [{ type: 'text', text: 'نص مُوسَّط' }] },
        { type: 'heading', attrs: { level: 2, textAlign: 'left' }, content: [{ type: 'text', text: 'عنوان لليسار' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'نص افتراضي بلا محاذاة صريحة' }] },
      ],
    };
    const html = renderContractHtml(doc, parties);
    expect(html).toContain('<p style="text-align: center">نص مُوسَّط</p>');
    expect(html).toContain('<h2 style="text-align: left">عنوان لليسار</h2>');
    expect(html).toContain('<p>نص افتراضي بلا محاذاة صريحة</p>');
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

  it('يتجاهل قيمة محاذاة غير معروفة بدل حقنها في style', () => {
    const doc: JsonNode = {
      type: 'doc',
      content: [{ type: 'paragraph', attrs: { textAlign: 'evil" onload="x' }, content: [{ type: 'text', text: 'نص' }] }],
    };
    const html = renderContractHtml(doc, parties);
    expect(html).toContain('<p>نص</p>');
    expect(html).not.toContain('onload');
  });
});
