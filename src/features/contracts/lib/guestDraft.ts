import type { JSONContent } from '@tiptap/react';
import type { DraftParty, TermMode } from '../components/wizard/PartiesStep';
import type { DocumentType, TermUnit } from '../types';

// يُستخدم عندما يواصل زائر (بلا حساب) تعبئة معالج إنشاء عقد/تفويض دون تسجيل
// دخول: نحفظ كل ما أدخله محليًا هنا قبل تحويله لتسجيل الدخول أو إنشاء حساب، ثم
// نستعيده عند عودته إلى المعالج بعد المصادقة لإكمال الإرسال دون إعادة إدخال شيء.
const KEY = 'iqrar-guest-contract-draft';

export type GuestResumeStep = 'upload' | 'review';

export interface GuestDraftState {
  documentType: DocumentType;
  method: 'pdf' | 'editor';
  resumeStep: GuestResumeStep;
  title: string;
  durationDays: string;
  companyName: string;
  companyCrNumber: string;
  termMode: TermMode;
  termValue: string;
  termUnit: TermUnit;
  termEndDate: string;
  parties: DraftParty[];
  body: JSONContent | null;
}

export function saveGuestDraft(draft: GuestDraftState): void {
  window.sessionStorage.setItem(KEY, JSON.stringify(draft));
}

export function consumeGuestDraft(): GuestDraftState | null {
  const raw = window.sessionStorage.getItem(KEY);
  if (!raw) return null;
  window.sessionStorage.removeItem(KEY);
  try {
    return JSON.parse(raw) as GuestDraftState;
  } catch {
    return null;
  }
}
