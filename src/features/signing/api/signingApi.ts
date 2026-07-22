import { supabase } from '@/lib/supabase/client';
import { extractFunctionError } from '@/shared/lib/errorMessage';
import type { ContractField } from '@/features/contracts';

export interface SigningPartyData {
  id: string;
  role_label: string;
  full_name: string;
  national_id: string | null;
  email: string | null;
  phone: string | null;
}

// طرف بطريقة "يدوي" لم يتحقق بعد من هويته عبر رمز SMS (انظر
// SigningIdentityGate): الجلسة تحمل بيانات الطرف الأساسية فقط دون أي محتوى
// للعقد، حتى يكتمل التحقق.
export interface SigningIdentityGateSession {
  otp_required: true;
  party: { id: string; role_label: string; full_name: string; verification_method: 'manual' | 'nafath' };
}

// طرف عقد ذي ترتيب توقيع إلزامي يفتح رابطه قبل أن يوقّع من يسبقه — لا يُعرض
// له أي محتوى حتى يحين دوره (انظر ContractTemplatesPage: "ترتيب توقيع إلزامي").
export interface SigningWaitingTurnSession {
  otp_required?: false;
  waiting_for_turn: true;
  party: { id: string; role_label: string; full_name: string };
}

export interface SigningFullSession {
  otp_required?: false;
  waiting_for_turn?: false;
  contract: { id: string; title: string; status: string; page_count: number; source_type: string; body_json: unknown };
  party: { id: string; role_label: string; full_name: string; status: string; saved_signature_data_url: string | null };
  fields: ContractField[];
  pdf_url: string | null;
  all_parties: SigningPartyData[] | null;
}

export type SigningSession = SigningIdentityGateSession | SigningWaitingTurnSession | SigningFullSession;

export async function fetchSigningSession(token: string): Promise<SigningSession> {
  const { data, error } = await supabase.functions.invoke<SigningSession | { error: string }>('get-signing-session', {
    body: { token },
  });
  if (error) throw await extractFunctionError(error);
  if (data && 'error' in data) throw new Error(data.error);
  return data as SigningSession;
}

export async function submitSignature(token: string, values: Record<string, unknown>): Promise<{ completed: boolean }> {
  const { data, error } = await supabase.functions.invoke<{ success: boolean; completed: boolean } | { error: string }>(
    'submit-signature',
    { body: { token, values, action: 'sign' } },
  );
  if (error) throw await extractFunctionError(error);
  if (data && 'error' in data) throw new Error(data.error);
  return data as { completed: boolean };
}

export async function rejectSignature(token: string, reason: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ success: boolean } | { error: string }>('submit-signature', {
    body: { token, action: 'reject', reason },
  });
  if (error) throw await extractFunctionError(error);
  if (data && 'error' in data) throw new Error(data.error);
}

// يطلب رمز تحقق عبر SMS لإثبات هوية طرف بطريقة "يدوي" قبل تمكينه من رؤية
// محتوى العقد أصلًا — بوابة منفصلة تمامًا عن requestSigningOtp (تلك خاصة
// بإعادة استخدام توقيع محفوظ لاحقًا أثناء التوقيع نفسه).
export async function requestSigningIdentityOtp(
  token: string,
): Promise<{ ok: boolean; required: boolean; sms_configured?: boolean; dev_code?: string; phone_hint?: string }> {
  const { data, error } = await supabase.functions.invoke<
    { ok: boolean; required: boolean; sms_configured?: boolean; dev_code?: string; phone_hint?: string } | { error: string }
  >('request-signing-identity-otp', { body: { token } });
  if (error) throw await extractFunctionError(error);
  if (data && 'error' in data) throw new Error(data.error);
  return data as { ok: boolean; required: boolean; sms_configured?: boolean; dev_code?: string; phone_hint?: string };
}

export async function verifySigningIdentityOtp(token: string, code: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ ok: boolean } | { error: string }>('verify-signing-identity-otp', {
    body: { token, code },
  });
  if (error) throw await extractFunctionError(error);
  if (data && 'error' in data) throw new Error(data.error);
}
