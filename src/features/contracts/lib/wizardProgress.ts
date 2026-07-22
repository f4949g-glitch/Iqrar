import type { JSONContent } from '@tiptap/react';
import type { DraftParty, TermMode } from '../components/wizard/PartiesStep';
import type { Contract, ContractField, ContractParty, DocumentType, TermUnit } from '../types';

// يحفظ تقدّم معالج الإنشاء باستمرار أثناء التعبئة (وليس مرة واحدة فقط كمسودة
// الزائر) كي لا تُفقَد البيانات إن غادر المستخدم المعالج لصفحة أخرى ثم عاد إليه.
// لكل خدمة (عقد/تفويض) خانة حفظ مستقلة، ليتمكن المستخدم من التبديل الحر بين
// "إنشاء عقد" و"إنشاء تفويض" في أي وقت: ما أدخله في كل خدمة يُحفَظ كمسودة
// تلقائيًا ويُستعاد عند العودة إليها، دون أن تسحق إحداهما مسودة الأخرى.
const KEY_BY_TYPE: Record<DocumentType, string> = {
  contract: 'iqrar-wizard-progress-contract',
  power_of_attorney: 'iqrar-wizard-progress-poa',
};

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

// خانة الحفظ تُشتق من نوع الوثيقة داخل الحالة نفسها، فيستحيل حفظ مسودة عقد
// فوق مسودة تفويض أو العكس.
export function saveWizardProgress(state: WizardProgressState): void {
  try {
    window.sessionStorage.setItem(KEY_BY_TYPE[state.documentType], JSON.stringify(state));
  } catch {
    // تجاهل فشل الحفظ (مثلًا تجاوز حد سعة sessionStorage) — لا يجوز أن يكسر تعبئة المعالج
  }
}

// لا يحذف المحفوظ عند القراءة (بخلاف مسودة الزائر) لأنه يُقرأ ويُكتب باستمرار
// طوال بقاء المستخدم داخل المعالج، لا مرة واحدة عند الانتقال بين صفحتين فقط.
export function loadWizardProgress(documentType: DocumentType): WizardProgressState | null {
  const raw = window.sessionStorage.getItem(KEY_BY_TYPE[documentType]);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WizardProgressState;
    // حارس ضد بيانات قديمة/تالفة من إصدار سابق كانت فيه الخانة مشتركة.
    return parsed.documentType === documentType ? parsed : null;
  } catch {
    return null;
  }
}

export function clearWizardProgress(documentType: DocumentType): void {
  window.sessionStorage.removeItem(KEY_BY_TYPE[documentType]);
}
