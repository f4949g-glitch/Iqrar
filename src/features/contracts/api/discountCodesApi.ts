import { supabase } from '@/lib/supabase/client';
import { translateErrorMessage } from '@/shared/lib/errorMessage';

export type DiscountApprovalStatus = 'approved' | 'pending' | 'rejected';

export interface DiscountCode {
  id: string;
  code: string;
  discount_percent: number;
  max_uses: number | null;
  max_uses_per_user: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  approval_status: DiscountApprovalStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
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
  if (error) throw new Error(translateErrorMessage(error.message));
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

// إن كان المستخدم أدمن فرعيًا بصلاحية إنشاء أكواد خصم بلا موافقة مباشرة (وليس
// أدمنًا كاملًا)، يُنشأ الكود بحالة "pending" وغير مُفعَّل حتى يوافق عليه
// الأدمن الرئيسي من قسم الطلبات — القاعدة الفعلية تُفرَض من سياسة RLS نفسها
// (discount_codes_insert)، وهذا الطرف مجرّد اختيار القيم الصحيحة قبل الإرسال.
export async function createDiscountCode(input: NewDiscountCodeInput, needsApproval: boolean): Promise<DiscountCode> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('غير مسجّل الدخول');

  const { data, error } = await supabase
    .from('discount_codes')
    .insert({
      ...input,
      created_by: userData.user.id,
      approval_status: needsApproval ? 'pending' : 'approved',
      is_active: !needsApproval,
    })
    .select()
    .single();
  if (error) throw new Error(translateErrorMessage(error.message));
  return data as DiscountCode;
}

export async function toggleDiscountCode(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('discount_codes').update({ is_active: isActive }).eq('id', id);
  if (error) throw new Error(translateErrorMessage(error.message));
}

export interface DiscountCodeUpdateInput {
  discount_percent: number;
  max_uses: number | null;
  max_uses_per_user: number | null;
  starts_at: string | null;
  ends_at: string | null;
}

// تعديل شروط كود خصم قائم (نسبة الخصم، حدود الاستخدام، تمديد/تغيير تاريخ
// الانتهاء) — مقصور على الأدمن الرئيسي فقط عبر سياسة discount_codes_update.
export async function updateDiscountCode(id: string, input: DiscountCodeUpdateInput): Promise<void> {
  const { error } = await supabase.from('discount_codes').update(input).eq('id', id);
  if (error) throw new Error(translateErrorMessage(error.message));
}

export async function deleteDiscountCode(id: string): Promise<void> {
  const { error } = await supabase.from('discount_codes').delete().eq('id', id);
  if (error) throw new Error(translateErrorMessage(error.message));
}

// موافقة/رفض الأدمن الرئيسي على كود خصم أنشأه أدمن فرعي بلا صلاحية مباشرة.
export async function reviewDiscountCode(id: string, approve: boolean): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('غير مسجّل الدخول');
  const { error } = await supabase
    .from('discount_codes')
    .update({
      approval_status: approve ? 'approved' : 'rejected',
      is_active: approve,
      reviewed_by: userData.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw new Error(translateErrorMessage(error.message));
}

export async function previewDiscountCode(code: string, partyCount: number): Promise<DiscountPreview> {
  const { data, error } = await supabase.rpc('preview_discount_code', { p_code: code, p_party_count: partyCount });
  if (error) throw new Error(translateErrorMessage(error.message));
  const row = (data as DiscountPreview[])[0];
  return row;
}

export async function setContractDiscountCode(contractId: string, code: string | null): Promise<void> {
  if (!code) {
    const { error } = await supabase.from('contracts').update({ discount_code_id: null }).eq('id', contractId);
    if (error) throw new Error(translateErrorMessage(error.message));
    return;
  }
  const { error } = await supabase.rpc('set_contract_discount_code', { p_contract_id: contractId, p_code: code });
  if (error) throw new Error(translateErrorMessage(error.message));
}
