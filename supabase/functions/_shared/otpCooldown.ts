// فترة تهدئة إلزامية بين كل طلب رمز تحقق وآخر لنفس الهدف (جوال/رقم هوية/طرف)،
// لمنع إغراق رقم جوال برسائل SMS متتالية بلا حدود (تكلفة فعلية + إزعاج) — كان
// بالإمكان استدعاء دوال طلب الرمز بلا أي قيد قبل هذا التعديل.
export const OTP_COOLDOWN_SECONDS = 60;

export function otpCooldownMessage(createdAt: string | null | undefined): string | null {
  if (!createdAt) return null;
  const elapsedSeconds = (Date.now() - new Date(createdAt).getTime()) / 1000;
  if (elapsedSeconds >= OTP_COOLDOWN_SECONDS) return null;
  const remaining = Math.ceil(OTP_COOLDOWN_SECONDS - elapsedSeconds);
  return `الرجاء الانتظار ${remaining} ثانية قبل إعادة طلب الرمز`;
}
