import { supabase } from '@/lib/supabase/client';

export interface ContractNotification {
  id: string;
  title: string;
  completed_at: string;
}

// إشعارات "عقد مرسل وتمت الموافقة عليه" — العقود التي أنشأها المستخدم واكتمل
// توقيعها من جميع الأطراف. تُرتَّب الأحدث أولًا.
export async function fetchCompletedContractNotifications(): Promise<ContractNotification[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select('id, title, completed_at')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as ContractNotification[];
}

export async function markNotificationsSeen(): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;
  const { error } = await supabase.from('profiles').update({ notifications_seen_at: new Date().toISOString() }).eq('id', userData.user.id);
  if (error) throw error;
}
