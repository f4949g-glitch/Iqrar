import { describe, expect, it, beforeEach } from 'vitest';
import { saveWizardProgress, loadWizardProgress, clearWizardProgress, type WizardProgressState } from '../lib/wizardProgress';

function makeState(overrides: Partial<WizardProgressState> = {}): WizardProgressState {
  return {
    step: 'parties',
    method: null,
    documentType: 'contract',
    title: '',
    durationDays: '3',
    companyName: '',
    companyCrNumber: '',
    companyLogoDataUrl: null,
    termMode: 'none',
    termValue: '',
    termUnit: 'month',
    termEndDate: '',
    draftParties: [],
    body: null,
    contract: null,
    parties: [],
    pdfUrl: '',
    pageCount: 0,
    fields: [],
    ...overrides,
  };
}

describe('wizardProgress', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('يعيد null عند عدم وجود تقدّم محفوظ', () => {
    expect(loadWizardProgress('contract')).toBeNull();
  });

  it('يحفظ التقدّم ويعيده بنفس القيم', () => {
    const state = makeState({ step: 'review', title: 'عقد بيع' });
    saveWizardProgress(state);
    expect(loadWizardProgress('contract')).toEqual(state);
  });

  it('يحتفظ بخانتين مستقلتين لعقد وتفويض دون تداخل', () => {
    saveWizardProgress(makeState({ documentType: 'contract', title: 'عقد' }));
    saveWizardProgress(makeState({ documentType: 'power_of_attorney', title: 'تفويض' }));
    expect(loadWizardProgress('contract')?.title).toBe('عقد');
    expect(loadWizardProgress('power_of_attorney')?.title).toBe('تفويض');
  });

  it('لا يحذف المحفوظ عند القراءة (بخلاف مسودة الزائر)', () => {
    saveWizardProgress(makeState());
    loadWizardProgress('contract');
    expect(loadWizardProgress('contract')).not.toBeNull();
  });

  it('يرفض بيانات محفوظة من خانة documentType مختلفة (حارس ضد بيانات قديمة)', () => {
    window.sessionStorage.setItem('iqrar-wizard-progress-contract', JSON.stringify(makeState({ documentType: 'power_of_attorney' })));
    expect(loadWizardProgress('contract')).toBeNull();
  });

  it('يعيد null عند بيانات محفوظة تالفة (JSON غير صالح)', () => {
    window.sessionStorage.setItem('iqrar-wizard-progress-contract', '{not valid');
    expect(loadWizardProgress('contract')).toBeNull();
  });

  it('يمسح التقدّم المحفوظ عند الطلب صراحة', () => {
    saveWizardProgress(makeState());
    clearWizardProgress('contract');
    expect(loadWizardProgress('contract')).toBeNull();
  });
});
