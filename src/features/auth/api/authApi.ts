import { supabase } from '@/lib/supabase/client';
import { extractFunctionError, translateErrorMessage } from '@/shared/lib/errorMessage';
import type { Profile } from '../types';

async function invokeAuthFunction<T>(name: string, body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T & { error?: string }>(name, { body });
  if (error) throw await extractFunctionError(error);
  if (data && (data as { error?: string }).error) throw new Error((data as { error: string }).error);
  return data as T;
}

export interface RequestOtpPayload {
  phone: string;
  national_id: string;
  email: string;
}

export async function requestRegistrationOtp(payload: RequestOtpPayload) {
  return invokeAuthFunction<{ ok: boolean; sms_configured: boolean; dev_code?: string }>('register-request-otp', payload);
}

export interface VerifyOtpPayload {
  phone: string;
  code: string;
  full_name: string;
  national_id: string;
  nationality: string;
  date_of_birth: string;
  email: string;
  password: string;
}

export async function verifyRegistrationOtp(payload: VerifyOtpPayload) {
  return invokeAuthFunction<{ ok: boolean }>('register-verify-otp', payload);
}

export async function requestPasswordReset(nationalId: string) {
  return invokeAuthFunction<{ ok: boolean; sms_configured: boolean; dev_code?: string }>('request-password-reset', {
    national_id: nationalId,
  });
}

export async function confirmPasswordReset(nationalId: string, code: string, newPassword: string) {
  return invokeAuthFunction<{ ok: boolean }>('confirm-password-reset', {
    national_id: nationalId,
    code,
    new_password: newPassword,
  });
}

export async function signInWithNationalId(nationalId: string, password: string) {
  const { data: email, error: lookupError } = await supabase.rpc('login_email_for_national_id', {
    p_national_id: nationalId.trim(),
  });
  if (lookupError || !email) throw new Error('رقم الهوية أو كلمة المرور غير صحيحة');

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error('رقم الهوية أو كلمة المرور غير صحيحة');
}

export async function fetchCurrentProfile(): Promise<Profile | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data, error } = await supabase.from('profiles').select('*').eq('id', userData.user.id).maybeSingle();
  if (error) throw new Error(translateErrorMessage(error.message));
  return data as Profile | null;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(translateErrorMessage(error.message));
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(translateErrorMessage(error.message));
}

export async function changePassword(newPassword: string) {
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) throw new Error(translateErrorMessage(updateError.message));

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', userData.user.id);
  if (profileError) throw new Error(translateErrorMessage(profileError.message));
}

// يحفظ توقيع المستخدم (مرسومًا أو مرفوعًا) في ملفه الشخصي. هذا التوقيع المحفوظ
// وحده لا يكفي لاستخدامه في التوقيع الإلكتروني على عقد؛ يجب أولًا التحقق منه عبر
// رمز يُرسل للجوال عند فتح رابط التوقيع (انظر signingApi.requestSigningOtp).
export async function saveSignature(dataUrl: string | null): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('يجب تسجيل الدخول');

  const { error } = await supabase.from('profiles').update({ signature_data_url: dataUrl }).eq('id', userData.user.id);
  if (error) throw new Error(translateErrorMessage(error.message));
}

export interface UpdateProfileInput {
  user_id?: string;
  full_name: string;
  national_id: string;
  email: string;
  nationality: string;
  date_of_birth: string | null;
  phone: string;
}

// دالة خادمية موحّدة لتعديل الملف الشخصي. عند تعديل المستخدم لبياناته هو (بلا
// user_id) تُطبَّق الجنسية وتاريخ الميلاد فقط — الاسم ورقم الهوية والبريد والجوال
// لم تعد قابلة للتعديل الذاتي المباشر من هنا (انظر requestProfileChangeOtp
// لتغيير البريد/الجوال، وsubmitContactMessage بفئة name_change_request لطلب
// تغيير الاسم؛ رقم الهوية لا يعدّله إلا الأدمن). عند تمرير user_id لمستخدم آخر،
// الدالة تتحقق خادميًا أن الطالب أدمن كامل، وعندها تُطبَّق كل الحقول كاملة.
export async function updateProfile(input: UpdateProfileInput): Promise<Profile> {
  const { data, error } = await supabase.functions.invoke<{ ok: boolean; profile: Profile; error?: string }>('update-profile', {
    body: input,
  });
  if (error) throw await extractFunctionError(error);
  if (data && 'error' in data && data.error) throw new Error(data.error);
  return (data as { profile: Profile }).profile;
}

export type ProfileChangeField = 'email' | 'phone';

export interface RequestProfileChangeOtpResult {
  ok: boolean;
  sms_configured?: boolean;
  email_configured?: boolean;
  dev_code?: string;
}

// يطلب رمز تحقق يُرسَل إلى البريد/الجوال الحالي (القديم) لإثبات ملكيته، تمهيدًا
// لتغييره إلى القيمة الجديدة المطلوبة (تُرسَل هنا) بعد التحقق عبر confirmProfileChange.
export async function requestProfileChangeOtp(field: ProfileChangeField, newValue: string): Promise<RequestProfileChangeOtpResult> {
  return invokeAuthFunction<RequestProfileChangeOtpResult>('request-profile-change-otp', { field, new_value: newValue });
}

export async function confirmProfileChange(field: ProfileChangeField, code: string): Promise<{ ok: boolean; new_value: string }> {
  return invokeAuthFunction<{ ok: boolean; new_value: string }>('confirm-profile-change', { field, code });
}
