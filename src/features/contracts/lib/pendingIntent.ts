import type { JSONContent } from '@tiptap/react';
import type { DocumentType, VerificationMethod } from '../types';

// يُخزَّن الاختيار الذي يقوم به الزائر في نافذة "عدد الأطراف والسعر" على الصفحة
// الرئيسية قبل الدخول/التسجيل/الاستمرار كضيف — نستخدم sessionStorage بدل router
// state لأنه ينجو من عملية إعادة التوجيه بعد تسجيل الدخول أو إنشاء الحساب (التي
// لا تحافظ حاليًا على وجهة العودة)، ويُقرأ مرة واحدة فقط عند فتح معالج إنشاء العقد.
const KEY = 'iqrar-pending-contract-intent';

export interface PendingContractIntent {
  documentType: DocumentType;
  partyCount: number;
  verificationDefault: VerificationMethod;
  // عند بدء عقد من قالب جاهز (صفحة "قوالبي"): معرّف القالب ومحتواه الثابت
  // (body_json يحمل مراجع أطراف مؤقتة tmpl-party-* تُستبدل بمعرّفات حقيقية فور
  // إنشاء الأطراف فعليًا في القاعدة — انظر NewContractWizard).
  templateId?: string;
  templateTitle?: string;
  templateBody?: JSONContent;
  templateSequentialSigning?: boolean;
}

export function setPendingContractIntent(intent: PendingContractIntent): void {
  window.sessionStorage.setItem(KEY, JSON.stringify(intent));
}

export function consumePendingContractIntent(): PendingContractIntent | null {
  const raw = window.sessionStorage.getItem(KEY);
  if (!raw) return null;
  window.sessionStorage.removeItem(KEY);
  try {
    return JSON.parse(raw) as PendingContractIntent;
  } catch {
    return null;
  }
}
