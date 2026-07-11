import { supabase } from '@/lib/supabase/client';
import { extractFunctionError, translateErrorMessage } from '@/shared/lib/errorMessage';
import { updateProfile } from './authApi';
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
  if (error) throw await extractFunctionError(error);
  if (data && 'error' in data && data.error) throw new Error(data.error);
  return data as CreateSubAdminResult;
}

export async function listAdminUsers(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*').in('role', ['admin', 'sub_admin']).order('created_at', { ascending: false });
  if (error) throw new Error(translateErrorMessage(error.message));
  return data as Profile[];
}

export async function updateSubAdminPermissions(id: string, permissions: AdminPermission[]): Promise<void> {
  const { error } = await supabase.from('profiles').update({ admin_permissions: permissions }).eq('id', id);
  if (error) throw new Error(translateErrorMessage(error.message));
}

// كل المستخدمين المسجَّلين (عملاء وإداريين) — تُستخدم في أداة الأدمن لتعديل
// بيانات أي مستخدم (انظر AdminUsersPage → قسم "بيانات جميع المستخدمين").
export async function listAllUsers(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(translateErrorMessage(error.message));
  return data as Profile[];
}

export interface AdminUpdateUserProfileInput {
  full_name: string;
  national_id: string;
  email: string;
  nationality: string;
  date_of_birth: string | null;
  phone: string;
}

export async function adminUpdateUserProfile(userId: string, input: AdminUpdateUserProfileInput): Promise<Profile> {
  return updateProfile({ user_id: userId, ...input });
}
