import { supabase } from '@/lib/supabase/client';

export interface CreditCode {
  id: string;
  code: string;
  amount: number;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  created_at: string;
}

export async function listCreditCodes(): Promise<CreditCode[]> {
  const { data, error } = await supabase.from('credit_codes').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as CreditCode[];
}

export async function createCreditCode(input: { code: string; amount: number; max_uses: number | null }): Promise<CreditCode> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('يلزم تسجيل الدخول');
  const { data, error } = await supabase
    .from('credit_codes')
    .insert({ ...input, created_by: userData.user.id })
    .select()
    .single();
  if (error) throw error;
  return data as CreditCode;
}

export async function toggleCreditCode(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('credit_codes').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
}

export async function deleteCreditCode(id: string): Promise<void> {
  const { error } = await supabase.from('credit_codes').delete().eq('id', id);
  if (error) throw error;
}

export async function redeemCreditCode(code: string): Promise<number> {
  const { data, error } = await supabase.rpc('redeem_credit_code', { p_code: code });
  if (error) throw error;
  return data as number;
}

export async function fetchMyBalance(): Promise<number> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return 0;
  const { data, error } = await supabase.from('profiles').select('credit_balance').eq('id', userData.user.id).single();
  if (error) throw error;
  return (data as { credit_balance: number }).credit_balance;
}
