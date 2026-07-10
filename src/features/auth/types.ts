export type AdminPermission =
  | 'view_reports'
  | 'create_discount_codes'
  | 'create_discount_codes_direct'
  | 'create_credit_codes'
  | 'create_credit_codes_direct'
  | 'manage_pricing'
  | 'manage_pricing_direct';

export const ADMIN_PERMISSION_LABELS: Record<AdminPermission, string> = {
  view_reports: 'الاطلاع على التقارير الإحصائية',
  create_discount_codes: 'إنشاء أكواد خصم (تُرسَل لموافقة الأدمن الرئيسي)',
  create_discount_codes_direct: 'إنشاء أكواد خصم مباشرة بلا حاجة لموافقة',
  create_credit_codes: 'إنشاء أكواد شحن (تُرسَل لموافقة الأدمن الرئيسي)',
  create_credit_codes_direct: 'إنشاء أكواد شحن مباشرة بلا حاجة لموافقة',
  manage_pricing: 'تعديل إعدادات التسعير (تُرسَل لموافقة الأدمن الرئيسي)',
  manage_pricing_direct: 'تعديل إعدادات التسعير مباشرة بلا حاجة لموافقة',
};

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'member' | 'sub_admin';
  must_change_password: boolean;
  national_id: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  phone: string | null;
  notifications_seen_at: string | null;
  signature_data_url: string | null;
  admin_permissions: AdminPermission[];
  created_at: string;
}

export function hasAdminPermission(profile: Profile | null, permission: AdminPermission): boolean {
  if (!profile) return false;
  if (profile.role === 'admin') return true;
  return profile.role === 'sub_admin' && profile.admin_permissions.includes(permission);
}
