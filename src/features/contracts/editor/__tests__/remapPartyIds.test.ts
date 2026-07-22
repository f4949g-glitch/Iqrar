import { describe, expect, it } from 'vitest';
import type { JSONContent } from '@tiptap/react';
import { remapPartyIds } from '../remapPartyIds';

describe('remapPartyIds', () => {
  it('يستبدل معرّف الطرف داخل حقل دمج (mergeField) بالمعرّف الحقيقي', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [{ type: 'mergeField', attrs: { partyId: 'guest-temp-0', fieldKey: 'full_name' } }],
    };
    const result = remapPartyIds(doc, { 'guest-temp-0': 'real-id-1' });
    expect(result.content?.[0].attrs?.partyId).toBe('real-id-1');
  });

  it('يستبدل معرّف الطرف داخل حقل تعبئة (fillField) بالمعرّف الحقيقي', () => {
    const doc: JSONContent = { type: 'doc', content: [{ type: 'fillField', attrs: { partyId: 'guest-temp-1', label: 'س' } }] };
    const result = remapPartyIds(doc, { 'guest-temp-1': 'real-id-2' });
    expect(result.content?.[0].attrs?.partyId).toBe('real-id-2');
  });

  it('يترك المعرّف كما هو عند عدم وجوده في خريطة الاستبدال', () => {
    const doc: JSONContent = { type: 'doc', content: [{ type: 'mergeField', attrs: { partyId: 'unknown-id' } }] };
    const result = remapPartyIds(doc, { 'guest-temp-0': 'real-id-1' });
    expect(result.content?.[0].attrs?.partyId).toBe('unknown-id');
  });

  it('يستبدل المعرّفات داخل عقد متداخل (فقرات وجداول)', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                { type: 'tableCell', content: [{ type: 'fillField', attrs: { partyId: 'guest-temp-0', label: 'أ' } }] },
              ],
            },
          ],
        },
      ],
    };
    const result = remapPartyIds(doc, { 'guest-temp-0': 'real-id-1' });
    const cellField = result.content?.[0].content?.[0].content?.[0].content?.[0];
    expect(cellField?.attrs?.partyId).toBe('real-id-1');
  });

  it('لا يغيّر عُقَد بلا partyId (نص عادي)', () => {
    const doc: JSONContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'نص' }] }] };
    const result = remapPartyIds(doc, { 'guest-temp-0': 'real-id-1' });
    expect(result).toEqual(doc);
  });

  it('لا يُعدِّل المستند الأصلي (immutable)', () => {
    const doc: JSONContent = { type: 'doc', content: [{ type: 'mergeField', attrs: { partyId: 'guest-temp-0' } }] };
    remapPartyIds(doc, { 'guest-temp-0': 'real-id-1' });
    expect(doc.content?.[0].attrs?.partyId).toBe('guest-temp-0');
  });
});
