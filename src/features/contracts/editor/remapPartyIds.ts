import type { JSONContent } from '@tiptap/react';

// يُستخدم بعد أن يسجّل زائر (ألّف محتوى العقد قبل إنشاء حساب) دخوله فعليًا:
// نُبدّل معرّفات الأطراف المؤقتة التي استُخدمت أثناء الكتابة بمعرّفات الأطراف
// الحقيقية بعد إنشائها في القاعدة، داخل حقول الدمج والتعبئة المُضمَّنة في النص.
export function remapPartyIds(doc: JSONContent, idMap: Record<string, string>): JSONContent {
  const next: JSONContent = { ...doc };
  if ((next.type === 'mergeField' || next.type === 'fillField') && next.attrs) {
    const currentId = next.attrs.partyId as string | undefined;
    if (currentId && idMap[currentId]) {
      next.attrs = { ...next.attrs, partyId: idMap[currentId] };
    }
  }
  if (next.content) {
    next.content = next.content.map((child) => remapPartyIds(child, idMap));
  }
  return next;
}
