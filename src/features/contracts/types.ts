export type ContractStatus =
  | 'draft'
  | 'pending'
  | 'partially_completed'
  | 'completed'
  | 'expired'
  | 'rejected'
  | 'cancelled';

export type PartyStatus = 'pending' | 'viewed' | 'signed' | 'rejected';

export type FieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'phone'
  | 'date'
  | 'time'
  | 'signature'
  | 'image'
  | 'logo'
  | 'stamp'
  | 'checkbox'
  | 'select'
  | 'textarea'
  | 'file';

export type DocumentType = 'contract' | 'power_of_attorney';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  contract: 'عقد',
  power_of_attorney: 'تفويض',
};

export interface Contract {
  id: string;
  title: string;
  status: ContractStatus;
  source_type: 'pdf' | 'editor' | 'docx';
  document_type: DocumentType;
  verification_number: string | null;
  original_file_path: string | null;
  final_file_path: string | null;
  body_json: unknown;
  final_html: string | null;
  page_count: number;
  duration_days: number | null;
  expires_at: string | null;
  discount_code_id: string | null;
  invoice_amount: number | null;
  company_name: string | null;
  company_cr_number: string | null;
  company_logo_path: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  completed_at: string | null;
}

export type VerificationMethod = 'manual' | 'nafath';
export type NafathStatus = 'pending' | 'completed' | 'rejected' | 'expired';
export type PartyType = 'individual' | 'entity';

export const PARTY_TYPE_LABELS: Record<PartyType, string> = {
  individual: 'فرد',
  entity: 'منشأة',
};

export interface ContractParty {
  id: string;
  contract_id: string;
  role_label: string;
  full_name: string | null;
  national_id: string | null;
  email: string | null;
  phone: string | null;
  token: string;
  status: PartyStatus;
  order_index: number;
  user_id: string | null;
  signed_at: string | null;
  created_at: string;
  verification_method: VerificationMethod;
  date_of_birth: string | null;
  nafath_trans_id: string | null;
  nafath_random_code: string | null;
  nafath_status: NafathStatus | null;
  nafath_verified_at: string | null;
  party_type: PartyType;
  entity_name: string | null;
  entity_cr_number: string | null;
  nationality: string | null;
  address: string | null;
}

export interface ContractField {
  id: string;
  contract_id: string;
  party_id: string;
  field_type: FieldType;
  label: string;
  page_number: number | null;
  pos_x: number | null;
  pos_y: number | null;
  width: number | null;
  height: number | null;
  anchor_id: string | null;
  required: boolean;
  options: string[] | null;
  value: unknown;
  filled_at: string | null;
  created_at: string;
}

// بيانات الطرف القابلة للدمج مباشرة داخل نص العقد (بلا انتظار تعبئة لاحقة).
export type MergeFieldKey = 'full_name' | 'role_label' | 'national_id' | 'email' | 'phone';

export const MERGE_FIELD_LABELS: Record<MergeFieldKey, string> = {
  full_name: 'الاسم',
  role_label: 'الصفة',
  national_id: 'رقم الهوية/الإقامة',
  email: 'البريد الإلكتروني',
  phone: 'رقم الجوال',
};

export interface ContractEvent {
  id: string;
  contract_id: string;
  party_id: string | null;
  event_type: string;
  message: string | null;
  created_at: string;
}

export const PARTY_ROLE_OPTIONS = ['الطرف الأول', 'الطرف الثاني', 'بائع', 'مشتري', 'أخرى'] as const;

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'نص',
  number: 'رقم',
  email: 'بريد إلكتروني',
  phone: 'رقم جوال',
  date: 'تاريخ',
  time: 'وقت',
  signature: 'توقيع',
  image: 'صورة',
  logo: 'شعار',
  stamp: 'ختم',
  checkbox: 'مربع اختيار',
  select: 'قائمة منسدلة',
  textarea: 'نص متعدد الأسطر',
  file: 'رفع ملف',
};

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, { label: string; bg: string; fg: string }> = {
  draft: { label: 'مسودة', bg: '#E5E1D6', fg: '#5B6B82' },
  pending: { label: 'بانتظار التوثيق', bg: '#F5E8CE', fg: '#C9922B' },
  partially_completed: { label: 'مكتمل جزئيًا', bg: '#F5E8CE', fg: '#C9922B' },
  completed: { label: 'مكتمل', bg: '#E4EEEA', fg: '#4C7A6B' },
  expired: { label: 'منتهي الصلاحية', bg: '#F5E4DF', fg: '#B5533C' },
  rejected: { label: 'مرفوض', bg: '#F5E4DF', fg: '#B5533C' },
  cancelled: { label: 'ملغي', bg: '#E5E1D6', fg: '#5B6B82' },
};
