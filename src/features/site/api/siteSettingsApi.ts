import { supabase } from '@/lib/supabase/client';
import { translateErrorMessage } from '@/shared/lib/errorMessage';

export interface SocialLink {
  label: string;
  url: string;
}

export interface SiteSettings {
  org_name: string;
  logo_data_url: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  whatsapp_number: string | null;
  social_links: SocialLink[];
}

const COLUMNS = 'org_name, logo_data_url, contact_phone, contact_email, whatsapp_number, social_links';

export async function fetchSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase.from('site_settings').select(COLUMNS).eq('id', 1).single();
  if (error) throw new Error(translateErrorMessage(error.message));
  return data as unknown as SiteSettings;
}

export async function updateSiteSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from('site_settings')
    .update({ ...patch, updated_at: new Date().toISOString() } as never)
    .eq('id', 1)
    .select(COLUMNS)
    .single();
  if (error) throw new Error(translateErrorMessage(error.message));
  return data as unknown as SiteSettings;
}
