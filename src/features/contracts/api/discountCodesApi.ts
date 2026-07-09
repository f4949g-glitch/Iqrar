import { supabase } from '@/lib/supabase/client';

export interface DiscountCode {
  id: string;
  code: string;
  discount_percent: number;
  max_uses: number | null;
  max_uses_per_user: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DiscountPreview {
  discount_code_id: string | null;
  discount_percent: number | null;
  base_amount: number;
  final_amount: number;
  message: string | null;
}

export async function listDiscountCodes(): Promise<DiscountCode[]> {
  const { data, error } = await supabase.from('discount_codes').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as DiscountCode[];
}

export interface NewDiscountCodeInput {
  code: string;
  discount_percent: number;
  max_uses: number | null;
  max_uses_per_user: number | null;
  starts_at: string | null;
  ends_at: string | null;
}

export async function createDiscountCode(input: NewDiscountCodeInput): Promise<DiscountCode> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('غير مسجّل الدخول');

  const { data, error } = await supabase
    .from('discount_codes')
    .insert({ ...input, created_by: userData.user.id })
    .select()
    .single();
  if (error) throw error;
  return data as DiscountCode;
}

export async function toggleDiscountCode(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('discount_codes').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
}

export async function deleteDiscountCode(id: string): Promise<void> {
  const { error } = await supabase.from('discount_codes').delete().eq('id', id);
  if (error) throw error;
}

export async function previewDiscountCode(code: string, partyCount: number): Promise<DiscountPreview> {
  const { data, error } = await supabase.rpc('preview_discount_code', { p_code: code, p_party_count: partyCount });
  if (error) throw error;
  const row = (data as DiscountPreview[])[0];
  return row;
}

export async function setContractDiscountCode(contractId: string, code: string | null): Promise<void> {
  if (!code) {
    const { error } = await supabase.from('contracts').update({ discount_code_id: null }).eq('id', contractId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.rpc('set_contract_discount_code', { p_contract_id: contractId, p_code: code });
  if (error) throw error;
}
