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

// يطابق حساب الخادم في send_contract/preview_discount_code: قيمة أساسية تغطي أول
// طرفين + رسم لكل طرف زائد + ضريبة، بحد أدنى للفاتورة.
export function calculateInvoice(partyCount: number, pricing: PricingSettings): number {
  const base = Math.max(pricing.base_amount + Math.max(partyCount - 2, 0) * pricing.extra_party_fee, pricing.minimum_invoice);
  return Math.round(base * (1 + pricing.tax_percent / 100) * 100) / 100;
}
