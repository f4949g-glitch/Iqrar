import { describe, expect, it } from 'vitest';
import { extractFillFields } from '../extractFillFields';
import type { JsonNode } from '../renderContractHtml';

describe('extractFillFields', () => {
  it('يستخرج حقل تعبئة واحدًا من مستند بسيط', () => {
    const doc: JsonNode = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'fillField', attrs: { anchorId: 'f1', partyId: 'p1', fieldType: 'text', label: 'الاسم', required: true } },
          ],
        },
      ],
    };
    expect(extractFillFields(doc)).toEqual([
      { anchorId: 'f1', partyId: 'p1', fieldType: 'text', label: 'الاسم', required: true },
    ]);
  });

  it('يستخرج عدة حقول متداخلة على مستويات مختلفة من المستند', () => {
    const doc: JsonNode = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'fillField', attrs: { anchorId: 'f1', partyId: 'p1', fieldType: 'text', label: 'أ' } }],
        },
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  content: [{ type: 'fillField', attrs: { anchorId: 'f2', partyId: 'p2', fieldType: 'date', label: 'ب' } }],
                },
              ],
            },
          ],
        },
      ],
    };
    const result = extractFillFields(doc);
    expect(result).toHaveLength(2);
    expect(result.map((f) => f.anchorId)).toEqual(['f1', 'f2']);
  });

  it('يعيد مصفوفة فارغة عند عدم وجود أي حقل تعبئة', () => {
    const doc: JsonNode = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'نص عادي بلا حقول' }] }],
    };
    expect(extractFillFields(doc)).toEqual([]);
  });

  it('يفترض النوع text عند غياب fieldType', () => {
    const doc: JsonNode = { type: 'doc', content: [{ type: 'fillField', attrs: { anchorId: 'f1', partyId: 'p1', label: 'س' } }] };
    expect(extractFillFields(doc)[0].fieldType).toBe('text');
  });

  it('required يكون افتراضيًا صحيحًا إلا إن كان false صراحة', () => {
    const doc: JsonNode = {
      type: 'doc',
      content: [
        { type: 'fillField', attrs: { anchorId: 'f1', partyId: 'p1', label: 'أ' } },
        { type: 'fillField', attrs: { anchorId: 'f2', partyId: 'p1', label: 'ب', required: false } },
      ],
    };
    const result = extractFillFields(doc);
    expect(result[0].required).toBe(true);
    expect(result[1].required).toBe(false);
  });

  it('يتعامل مع attrs مفقودة كليًا دون أخطاء (تُستبعد من النتيجة)', () => {
    const doc: JsonNode = { type: 'doc', content: [{ type: 'fillField' }] };
    expect(extractFillFields(doc)).toEqual([]);
  });
});
