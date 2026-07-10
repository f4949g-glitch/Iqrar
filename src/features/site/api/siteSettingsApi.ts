import { supabase } from '@/lib/supabase/client';

export interface SiteSettings {
  org_name: string;
  logo_data_url: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  social_instagram: string | null;
  social_x: string | null;
  social_other_label: string | null;
  social_other_url: string | null;
}

const COLUMNS = 'org_name, logo_data_url, contact_phone, contact_email, social_instagram, social_x, social_other_label, social_other_url';

export async function fetchSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase.from('site_settings').select(COLUMNS).eq('id', 1).single();
  if (error) throw error;
  return data as SiteSettings;
}

export async function updateSiteSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from('site_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data as SiteSettings;
}
