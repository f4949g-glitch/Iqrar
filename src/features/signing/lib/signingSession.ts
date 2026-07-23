// معرِّف عشوائي لجلسة التوقيع الحالية داخل هذا التبويب، يُستخدَم لربط تحقق
// الهوية عبر SMS (لطرف "يدوي") بهذا التبويب تحديدًا بدل بقائه صالحًا للأبد
// بمجرد نجاحه مرة. sessionStorage يُمحى تلقائيًا عند إغلاق التبويب ولا يُشارَك
// بين تبويبات/متصفحات أخرى، فإعادة فتح رابط التوثيق (تبويب جديد، نسخه لمتصفح
// آخر، أو بعد إغلاق التبويب السابق) تعني عدم وجود معرِّف مطابق، فيُطلَب رمز
// تحقق جديد من جديد — بينما تحديث الصفحة أو التنقل داخل نفس التبويب لا يفقد
// التحقق السابق.
const KEY_PREFIX = 'iqrar-signing-session-';

export function newSigningSessionId(token: string): string {
  const id = crypto.randomUUID();
  window.sessionStorage.setItem(KEY_PREFIX + token, id);
  return id;
}

export function getSigningSessionId(token: string): string | null {
  return window.sessionStorage.getItem(KEY_PREFIX + token);
}
