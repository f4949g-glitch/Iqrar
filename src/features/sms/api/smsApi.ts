import { supabase } from '@/lib/supabase/client';
import { extractFunctionError, translateErrorMessage } from '@/shared/lib/errorMessage';

export interface SmsMessage {
  id: string;
  recipient_phone: string;
  message: string;
  status: 'sent' | 'failed';
  error_detail: string | null;
  sent_by: string | null;
  created_at: string;
}

// phone: صيغة دولية بدون "+" (966xxxxxxxxx) كما يُنتجها حقل الجوال في shared/ui/Field.
export async function sendAdminSms(phone: string, message: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ error?: string }>('admin-send-sms', {
    body: { phone, message },
  });
  if (error) throw await extractFunctionError(error);
  if (data && data.error) throw new Error(data.error);
}

export async function fetchSmsHistory(): Promise<SmsMessage[]> {
  const { data, error } = await supabase.from('sms_messages').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) throw new Error(translateErrorMessage(error.message));
  return data as SmsMessage[];
}

export interface SmsTemplate {
  key: string;
  label: string;
  description: string | null;
  body: string;
  updated_at: string;
}

export async function fetchSmsTemplates(): Promise<SmsTemplate[]> {
  const { data, error } = await supabase.from('sms_templates').select('*').order('key');
  if (error) throw new Error(translateErrorMessage(error.message));
  return data as SmsTemplate[];
}

export async function updateSmsTemplate(key: string, body: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('sms_templates')
    .update({ body, updated_at: new Date().toISOString(), updated_by: userData.user?.id ?? null })
    .eq('key', key);
  if (error) throw new Error(translateErrorMessage(error.message));
}
