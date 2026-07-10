import { supabase } from '@/lib/supabase/client';

export interface PricingSettings {
  base_amount: number;
  extra_party_fee: number;
  minimum_invoice: number;
  tax_percent: number;
}

export async function fetchPricingSettings(): Promise<PricingSettings> {
  const { data, error } = await supabase
    .from('pricing_settings')
    .select('base_amount, extra_party_fee, minimum_invoice, tax_percent')
    .eq('id', 1)
    .single();
  if (error) throw error;
  return data as PricingSettings;
}

export async function updatePricingSettings(patch: Partial<PricingSettings>): Promise<PricingSettings> {
  const { data, error } = await supabase
    .from('pricing_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select('base_amount, extra_party_fee, minimum_invoice, tax_percent')
    .single();
  if (error) throw error;
  return data as PricingSettings;
}

export type PricingRequestStatus = 'pending' | 'approved' | 'rejected';

export interface PricingChangeRequest extends PricingSettings {
  id: string;
  requested_by: string;
  status: PricingRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// أدمن فرعي بصلاحية "manage_pricing" بلا صلاحية "manage_pricing_direct" لا يعدّل
// إعدادات التسعير مباشرة (صف واحد مشترك للجميع)، بل يقدّم طلب تغيير ينتظر موافقة
// الأدمن الرئيسي — الذي يطبّق القيم فعليًا عند الموافقة (انظر reviewPricingChangeRequest).
export async function requestPricingChange(values: PricingSettings): Promise<PricingChangeRequest> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('غير مسجّل الدخول');
  const { data, error } = await supabase
    .from('pricing_change_requests')
    .insert({ ...values, requested_by: userData.user.id })
    .select()
    .single();
  if (error) throw error;
  return data as PricingChangeRequest;
}

export async function listPricingChangeRequests(): Promise<PricingChangeRequest[]> {
  const { data, error } = await supabase.from('pricing_change_requests').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as PricingChangeRequest[];
}

export async function reviewPricingChangeRequest(id: string, approve: boolean): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('غير مسجّل الدخول');

  if (approve) {
    const { data: request, error: fetchError } = await supabase.from('pricing_change_requests').select('*').eq('id', id).single();
    if (fetchError) throw fetchError;
    await updatePricingSettings({
      base_amount: request.base_amount,
      extra_party_fee: request.extra_party_fee,
      minimum_invoice: request.minimum_invoice,
      tax_percent: request.tax_percent,
    });
  }

  const { error } = await supabase
    .from('pricing_change_requests')
    .update({ status: approve ? 'approved' : 'rejected', reviewed_by: userData.user.id, reviewed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// يطابق حساب الخادم في send_contract/preview_discount_code: قيمة أساسية تغطي أول
// طرفين + رسم لكل طرف زائد + ضريبة، بحد أدنى للفاتورة.
export function calculateInvoice(partyCount: number, pricing: PricingSettings): number {
  const base = Math.max(pricing.base_amount + Math.max(partyCount - 2, 0) * pricing.extra_party_fee, pricing.minimum_invoice);
  return Math.round(base * (1 + pricing.tax_percent / 100) * 100) / 100;
}
