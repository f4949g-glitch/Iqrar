import { supabase } from '@/lib/supabase/client';
import { extractFunctionError, translateErrorMessage } from '@/shared/lib/errorMessage';

export interface EmailMessage {
  id: string;
  recipient_email: string;
  subject: string;
  message: string;
  status: 'sent' | 'failed';
  error_detail: string | null;
  sent_by: string | null;
  created_at: string;
}

export async function sendAdminEmail(email: string, subject: string, message: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ error?: string }>('admin-send-email', {
    body: { email, subject, message },
  });
  if (error) throw await extractFunctionError(error);
  if (data && data.error) throw new Error(data.error);
}

export async function fetchEmailHistory(): Promise<EmailMessage[]> {
  const { data, error } = await supabase.from('email_messages').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) throw new Error(translateErrorMessage(error.message));
  return data as EmailMessage[];
}
