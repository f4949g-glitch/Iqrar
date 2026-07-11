import { supabase } from '@/lib/supabase/client';
import { extractFunctionError } from '@/shared/lib/errorMessage';

export interface VerificationReprint {
  html: string;
  title: string;
}

export async function fetchVerificationReprint(verificationNumber: string): Promise<VerificationReprint> {
  const { data, error } = await supabase.functions.invoke<VerificationReprint & { error?: string }>('admin-reprint-verification', {
    body: { verification_number: verificationNumber },
  });
  if (error) throw await extractFunctionError(error);
  if (data && 'error' in data && data.error) throw new Error(data.error);
  return data as VerificationReprint;
}
