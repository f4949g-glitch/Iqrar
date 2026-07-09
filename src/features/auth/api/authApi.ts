import { supabase } from '@/lib/supabase/client';
import type { Profile } from '../types';

export async function fetchCurrentProfile(): Promise<Profile | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data, error } = await supabase.from('profiles').select('*').eq('id', userData.user.id).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function changePassword(newPassword: string) {
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) throw updateError;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', userData.user.id);
  if (profileError) throw profileError;
}
