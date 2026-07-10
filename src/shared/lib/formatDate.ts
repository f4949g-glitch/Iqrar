// نستخدم لاحقة -u-ca-gregory لأن التقويم الافتراضي في محرك JS للغة ar-SA هو
// التقويم الهجري (Islamic Umm al-Qura)، ما كان يجعل كل التواريخ في الموقع تظهر
// هجرية رغم أن قاعدة البيانات تخزّنها ميلادية.
const GREGORIAN_ARABIC_LOCALE = 'ar-SA-u-ca-gregory';

export function formatDate(value: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString(GREGORIAN_ARABIC_LOCALE, options);
}

export function formatDateTime(value: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleString(GREGORIAN_ARABIC_LOCALE, options);
}
