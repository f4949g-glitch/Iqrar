import { supabase } from '@/lib/supabase/client';

export interface PricingSettings {
  price_per_party: number;
  minimum_invoice: number;
}

export async function fetchPricingSettings(): Promise<PricingSettings> {
  const { data, error } = await supabase.from('pricing_settings').select('price_per_party, minimum_invoice').eq('id', 1).single();
  if (error) throw error;
  return data as PricingSettings;
}

export function calculateInvoice(partyCount: number, pricing: PricingSettings): number {
  const total = partyCount * pricing.price_per_party;
  return Math.max(total, pricing.minimum_invoice);
}
