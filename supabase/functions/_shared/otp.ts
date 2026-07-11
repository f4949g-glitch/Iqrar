// يولّد رمز تحقق مكوَّنًا من 6 أرقام باستخدام مولّد أرقام عشوائية آمن تشفيريًا
// (crypto.getRandomValues) بدل Math.random غير الآمنة تشفيريًا — رمز التحقق سرّ
// حسّاس يُستخدم لإثبات الهوية، فيجب ألا يكون متوقَّعًا حتى نظريًا.
export function generateOtpCode(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  const n = 100000 + (bytes[0] % 900000);
  return String(n);
}
