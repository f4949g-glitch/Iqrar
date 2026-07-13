// يُخفي معظم أرقام الجوال في الرسائل المعروضة للمستخدم، ولا يُرسل الرقم الفعلي
// للواجهة أبدًا.
export function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  return `${phone.slice(0, 3)}${'•'.repeat(phone.length - 5)}${phone.slice(-2)}`;
}
