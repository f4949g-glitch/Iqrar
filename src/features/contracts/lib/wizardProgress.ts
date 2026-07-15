import type { JSONContent } from '@tiptap/react';
import type { DraftParty, TermMode } from '../components/wizard/PartiesStep';
import type { Contract, ContractField, ContractParty, DocumentType, TermUnit } from '../types';

// يحفظ تقدّم معالج إنشاء العقد باستمرار أثناء التعبئة (وليس مرة واحدة فقط
// كمسودة الزائر) كي لا تُفقَد البيانات إن غادر المستخدم المعالج لصفحة أخرى
// (مثل الملف الشخصي) ثم عاد إليه — يُستعاد تلقائيًا عند فتح المعالج مجددًا
// طالما لم يُرسَل العقد فعليًا بعد.
const KEY = 'iqrar-wizard-progress';

export type WizardStep = 'parties' | 'method' | 'upload' | 'fields' | 'editor' | 'review';

export interface WizardProgressState {
  step: WizardStep;
  method: 'pdf' | 'editor' | null;
  documentType: DocumentType;
  title: string;
  durationDays: string;
  companyName: string;
  companyCrNumber: string;
  companyLogoDataUrl: string | null;
  termMode: TermMode;
  termValue: string;
  termUnit: TermUnit;
  termEndDate: string;
  draftParties: DraftParty[];
  body: JSONContent | null;
  // معرّفات العقد/الأطراف الحقيقية في القاعدة إن كانت قد أُنشئت بالفعل (بعد
  // اختيار طريقة الإنشاء) — تُستعاد لتفادي إنشاء صفوف مكرَّرة عند العودة.
  contract: Contract | null;
  parties: ContractParty[];
  pdfUrl: string;
  pageCount: number;
  fields: ContractField[];
}

export function saveWizardProgress(state: WizardProgressState): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // تجاهل فشل الحفظ (مثلًا تجاوز حد سعة sessionStorage) — لا يجوز أن يكسر تعبئة المعالج
  }
}

// لا يحذف المحفوظ عند القراءة (بخلاف مسودة الزائر) لأنه يُقرأ ويُكتب باستمرار
// طوال بقاء المستخدم داخل المعالج، لا مرة واحدة عند الانتقال بين صفحتين فقط.
export function loadWizardProgress(): WizardProgressState | null {
  const raw = window.sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WizardProgressState;
  } catch {
    return null;
  }
}

export function clearWizardProgress(): void {
  window.sessionStorage.removeItem(KEY);
}
