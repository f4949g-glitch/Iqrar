// قواعد تحقق موحّدة لحقول الهوية وكلمة المرور والبريد الإلكتروني، تُستخدم في كل
// نماذج الدخول/التسجيل/تغيير كلمة المرور لضمان نفس المعايير في كل مكان.

export function nationalIdError(value: string): string | null {
  if (!/^\d{10}$/.test(value)) return 'رقم الهوية يجب أن يتكون من 10 أرقام فقط';
  return null;
}

export function passwordError(value: string): string | null {
  if (value.length < 8 || value.length > 15) return 'كلمة المرور يجب أن تكون بين 8 و15 حرفًا';
  if (!/[a-z]/.test(value)) return 'كلمة المرور يجب أن تحتوي على حرف صغير';
  if (!/[A-Z]/.test(value)) return 'كلمة المرور يجب أن تحتوي على حرف كبير';
  if (!/[0-9]/.test(value)) return 'كلمة المرور يجب أن تحتوي على رقم';
  if (!/[^A-Za-z0-9]/.test(value)) return 'كلمة المرور يجب أن تحتوي على رمز خاص';
  return null;
}

export function emailError(value: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'أدخل بريدًا إلكترونيًا صحيحًا يحتوي على علامة @';
  return null;
}
