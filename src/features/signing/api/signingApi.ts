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

export interface SigningSession {
  contract: { id: string; title: string; status: string; page_count: number; source_type: string; body_json: unknown };
  party: { id: string; role_label: string; full_name: string; status: string; has_saved_signature: boolean };
  fields: ContractField[];
  pdf_url: string | null;
  all_parties: SigningPartyData[] | null;
}

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

// يطلب إرسال رمز تحقق عبر الجوال المسجَّل لصاحب التوقيع المحفوظ، تمهيدًا
// لاستخدامه في التوقيع الإلكتروني على هذا الرابط تحديدًا (لا يُستخدم التوقيع
// المحفوظ تلقائيًا أبدًا دون هذا التحقق).
export async function requestSigningOtp(token: string): Promise<{ ok: boolean; sms_configured: boolean; dev_code?: string; phone_hint: string }> {
  const { data, error } = await supabase.functions.invoke<
    { ok: boolean; sms_configured: boolean; dev_code?: string; phone_hint: string } | { error: string }
  >('request-signing-otp', { body: { token } });
  if (error) throw await extractFunctionError(error);
  if (data && 'error' in data) throw new Error(data.error);
  return data as { ok: boolean; sms_configured: boolean; dev_code?: string; phone_hint: string };
}

export async function verifySigningOtp(token: string, code: string): Promise<{ signature_data_url: string }> {
  const { data, error } = await supabase.functions.invoke<{ ok: boolean; signature_data_url: string } | { error: string }>(
    'verify-signing-otp',
    { body: { token, code } },
  );
  if (error) throw await extractFunctionError(error);
  if (data && 'error' in data) throw new Error(data.error);
  return data as { signature_data_url: string };
}
