import { supabase } from '@/lib/supabase/client';
import { translateErrorMessage } from '@/shared/lib/errorMessage';

export type ContactCategory = 'suggestion' | 'complaint' | 'technical_issue';
export type ContactStatus = 'new' | 'read';

export interface ContactMessage {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  category: ContactCategory;
  message: string;
  created_by: string | null;
  status: ContactStatus;
  created_at: string;
}

export interface NewContactMessageInput {
  name: string;
  email: string | null;
  phone: string | null;
  category: ContactCategory;
  message: string;
}

export async function submitContactMessage(input: NewContactMessageInput): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from('contact_messages').insert({ ...input, created_by: userData.user?.id ?? null });
  if (error) throw new Error(translateErrorMessage(error.message));
}

export async function listContactMessages(): Promise<ContactMessage[]> {
  const { data, error } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(translateErrorMessage(error.message));
  return data as ContactMessage[];
}

export async function markContactMessageRead(id: string): Promise<void> {
  const { error } = await supabase.from('contact_messages').update({ status: 'read' }).eq('id', id);
  if (error) throw new Error(translateErrorMessage(error.message));
}
