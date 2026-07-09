import { supabase } from '@/lib/supabase/client';

export interface NafathInitiateResult {
  configured: boolean;
  message?: string;
  trans_id?: string;
  random_code?: string;
  error?: string;
}

export async function initiateNafathVerification(partyId: string): Promise<NafathInitiateResult> {
  const { data, error } = await supabase.functions.invoke<NafathInitiateResult>('nafath-initiate', { body: { party_id: partyId } });
  if (error) throw new Error(error.message);
  return data as NafathInitiateResult;
}

export interface NafathStatusResult {
  configured: boolean;
  message?: string;
  status?: 'pending' | 'completed' | 'rejected' | 'expired';
  full_name?: string;
  error?: string;
}

export async function checkNafathStatus(partyId: string): Promise<NafathStatusResult> {
  const { data, error } = await supabase.functions.invoke<NafathStatusResult>('nafath-check-status', { body: { party_id: partyId } });
  if (error) throw new Error(error.message);
  return data as NafathStatusResult;
}
