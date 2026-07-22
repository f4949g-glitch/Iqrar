import { describe, expect, it, beforeEach } from 'vitest';
import { saveGuestDraft, consumeGuestDraft, type GuestDraftState } from '../lib/guestDraft';

function makeDraft(overrides: Partial<GuestDraftState> = {}): GuestDraftState {
  return {
    documentType: 'contract',
    method: 'editor',
    resumeStep: 'review',
    title: 'عقد تجريبي',
    durationDays: '3',
    companyName: '',
    companyCrNumber: '',
    companyLogoDataUrl: null,
    termMode: 'none',
    termValue: '',
    termUnit: 'month',
    termEndDate: '',
    parties: [],
    body: null,
    ...overrides,
  };
}

describe('guestDraft', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('يعيد null عند عدم وجود مسودة محفوظة', () => {
    expect(consumeGuestDraft()).toBeNull();
  });

  it('يحفظ المسودة ويعيدها بنفس القيم', () => {
    const draft = makeDraft({ title: 'عقد إيجار' });
    saveGuestDraft(draft);
    expect(consumeGuestDraft()).toEqual(draft);
  });

  it('يمسح المسودة بعد استهلاكها مرة واحدة', () => {
    saveGuestDraft(makeDraft());
    consumeGuestDraft();
    expect(consumeGuestDraft()).toBeNull();
  });

  it('يعيد null عند بيانات محفوظة تالفة (JSON غير صالح)', () => {
    window.sessionStorage.setItem('iqrar-guest-contract-draft', '{not valid json');
    expect(consumeGuestDraft()).toBeNull();
  });
});
