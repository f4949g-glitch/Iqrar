import { supabase } from '@/lib/supabase/client';
import type { AdminPermission, Profile } from '../types';

export interface CreateSubAdminInput {
  full_name: string;
  national_id: string;
  email: string;
  phone: string;
  permissions: AdminPermission[];
}

export interface CreateSubAdminResult {
  national_id: string;
  temp_password: string;
}

// إنشاء حساب أدمن فرعي جديد — عملية خادمية بالكامل (Edge Function) لأنها تتطلب
// صلاحية إنشاء حساب Supabase Auth مباشرة، وتتحقق من أن طالب الإنشاء أدمن كامل
// فعليًا بدل الوثوق بأي تحقق في الواجهة وحدها.
export async function createSubAdmin(input: CreateSubAdminInput): Promise<CreateSubAdminResult> {
  const { data, error } = await supabase.functions.invoke<CreateSubAdminResult & { error?: string }>('admin-create-user', {
    body: input,
  });
  if (error) {
    const context = (error as { context?: Response }).context;
    let specificMessage: string | undefined;
    if (context) {
      try {
        const parsed = await context.clone().json();
        if (parsed?.error) specificMessage = parsed.error;
      } catch {
        // تجاهل فشل التحليل والانتقال إلى الرسالة العامة أدناه
      }
    }
    throw new Error(specificMessage ?? error.message);
  }
  if (data && 'error' in data && data.error) throw new Error(data.error);
  return data as CreateSubAdminResult;
}

export async function listAdminUsers(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*').in('role', ['admin', 'sub_admin']).order('created_at', { ascending: false });
  if (error) throw error;
  return data as Profile[];
}

export async function updateSubAdminPermissions(id: string, permissions: AdminPermission[]): Promise<void> {
  const { error } = await supabase.from('profiles').update({ admin_permissions: permissions }).eq('id', id);
  if (error) throw error;
}
