import { supabase } from '@/lib/supabase/client';
import { translateErrorMessage } from '@/shared/lib/errorMessage';

export interface LegalPage {
  key: string;
  title: string;
  content: string;
  updated_at: string;
}

export interface LegalSection {
  title: string;
  body: string;
}

// المحتوى مخزَّن كنص عادي: كل قسم يبدأ بسطر "## عنوان" ثم فقرة النص التالية له.
export function parseLegalSections(content: string): LegalSection[] {
  return content
    .split(/\n(?=##\s)/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const [firstLine, ...rest] = block.split('\n');
      return { title: firstLine.replace(/^##\s*/, '').trim(), body: rest.join('\n').trim() };
    });
}

export async function fetchLegalPage(key: string): Promise<LegalPage> {
  const { data, error } = await supabase.from('legal_pages').select('*').eq('key', key).single();
  if (error) throw new Error(translateErrorMessage(error.message));
  return data as LegalPage;
}

export async function updateLegalPage(key: string, content: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('legal_pages')
    .update({ content, updated_at: new Date().toISOString(), updated_by: userData.user?.id ?? null })
    .eq('key', key);
  if (error) throw new Error(translateErrorMessage(error.message));
}
