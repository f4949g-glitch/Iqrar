import { supabase } from '@/lib/supabase/client';
import { translateErrorMessage } from '@/shared/lib/errorMessage';
import type { Contract, ContractEvent, ContractField, ContractParty, FieldType } from '../types';

export interface ContractListItem extends Contract {
  parties_count: number;
  signed_count: number;
}

// أعمدة العقد المطلوبة فعليًا لعرضه ضمن قائمة (بطاقة العقد لا تعرض سوى العنوان
// والحالة والتاريخ) — باستثناء body_json وfinal_html تحديدًا، فهما قد يكونان
// كبيرين جدًا (محتوى المستند/المستند النهائي المُصيَّر بالكامل) ولا حاجة لهما إلا
// في صفحة تفاصيل عقد واحد. جلبهما مع كل تبويب/بحث كان يُضاعف حجم كل استجابة قائمة
// دون أي فائدة، ويرفع استهلاك الطلبات/Egress في سوبابيس بشكل ملحوظ.
const CONTRACT_LIST_COLUMNS =
  'id, title, status, source_type, document_type, verification_number, original_file_path, final_file_path, page_count, duration_days, expires_at, term_value, term_unit, term_end_date, discount_code_id, invoice_amount, company_name, company_cr_number, company_logo_path, created_by, created_at, updated_at, sent_at, completed_at';

async function withPartyCounts(contracts: Contract[]): Promise<ContractListItem[]> {
  if (contracts.length === 0) return [];
  const ids = contracts.map((c) => c.id);
  const { data, error } = await supabase.from('contract_parties').select('contract_id, status').in('contract_id', ids);
  if (error) throw new Error(translateErrorMessage(error.message));

  return contracts.map((c) => {
    const parties = (data ?? []).filter((p) => p.contract_id === c.id);
    return {
      ...c,
      parties_count: parties.length,
      signed_count: parties.filter((p) => p.status === 'signed').length,
    };
  });
}

// عقود جديدة: مسودة، أو مُرسلة ولا تزال بانتظار توقيع بقية الأطراف.
export async function listActiveContracts(): Promise<ContractListItem[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select(CONTRACT_LIST_COLUMNS)
    .in('status', ['draft', 'pending', 'partially_completed'])
    .order('updated_at', { ascending: false });
  if (error) throw new Error(translateErrorMessage(error.message));
  return withPartyCounts((data ?? []) as Contract[]);
}

// العقود الموافق عليها: اكتمل توقيعها من جميع الأطراف فعليًا.
export async function listApprovedContracts(): Promise<ContractListItem[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select(CONTRACT_LIST_COLUMNS)
    .eq('status', 'completed')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(translateErrorMessage(error.message));
  return withPartyCounts((data ?? []) as Contract[]);
}

export async function listRejectedContracts(): Promise<ContractListItem[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select(CONTRACT_LIST_COLUMNS)
    .in('status', ['rejected', 'expired', 'cancelled'])
    .order('updated_at', { ascending: false });
  if (error) throw new Error(translateErrorMessage(error.message));
  return withPartyCounts((data ?? []) as Contract[]);
}

// طلبات الموافقة: عقود أنت طرف فيها بانتظار توقيعك أنت تحديدًا (وليس بالضرورة
// منشئها).
export async function listContractsAwaitingMySignature(): Promise<ContractListItem[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data: parties, error: partiesError } = await supabase
    .from('contract_parties')
    .select('contract_id')
    .eq('user_id', userData.user.id)
    .in('status', ['pending', 'viewed']);
  if (partiesError) throw partiesError;

  const contractIds = [...new Set((parties ?? []).map((p) => p.contract_id))];
  if (contractIds.length === 0) return [];

  const { data, error } = await supabase.from('contracts').select(CONTRACT_LIST_COLUMNS).in('id', contractIds).order('updated_at', { ascending: false });
  if (error) throw new Error(translateErrorMessage(error.message));
  return withPartyCounts((data ?? []) as Contract[]);
}

// بحث بعنوان العقد عبر كل العقود التي يستطيع المستخدم رؤيتها (أنشأها، أو طرف
// فيها، أو أدمن) بصرف النظر عن حالتها — لا يُقيَّد بالتبويب الحالي.
export async function searchContracts(query: string): Promise<ContractListItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const { data, error } = await supabase
    .from('contracts')
    .select(CONTRACT_LIST_COLUMNS)
    .ilike('title', `%${trimmed}%`)
    .order('updated_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(translateErrorMessage(error.message));
  return withPartyCounts((data ?? []) as Contract[]);
}

export async function createDraftContract(
  title: string,
  durationDays: number | null,
  sourceType: 'pdf' | 'editor' = 'pdf',
): Promise<Contract> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('غير مسجّل الدخول');

  const { data, error } = await supabase
    .from('contracts')
    .insert({ title, duration_days: durationDays, created_by: userData.user.id, source_type: sourceType })
    .select()
    .single();
  if (error) throw new Error(translateErrorMessage(error.message));
  return data as Contract;
}

export async function saveContractBody(contractId: string, bodyJson: unknown): Promise<Contract> {
  const { data, error } = await supabase
    .from('contracts')
    .update({ body_json: bodyJson as never, updated_at: new Date().toISOString() })
    .eq('id', contractId)
    .select()
    .single();
  if (error) throw new Error(translateErrorMessage(error.message));
  return data as Contract;
}

export async function updateContractMeta(
  contractId: string,
  patch: {
    title?: string;
    duration_days?: number | null;
    source_type?: 'pdf' | 'editor';
    company_name?: string | null;
    company_cr_number?: string | null;
    document_type?: 'contract' | 'power_of_attorney';
    term_value?: number | null;
    term_unit?: 'day' | 'week' | 'month' | 'year' | null;
    term_end_date?: string | null;
    sequential_signing?: boolean;
  },
): Promise<Contract> {
  const { data, error } = await supabase
    .from('contracts')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', contractId)
    .select()
    .single();
  if (error) throw new Error(translateErrorMessage(error.message));
  return data as Contract;
}

export async function uploadOriginalPdf(contractId: string, file: File, pageCount: number): Promise<Contract> {
  const path = `${contractId}/original.pdf`;
  const { error: uploadError } = await supabase.storage.from('contracts').upload(path, file, {
    upsert: true,
    contentType: 'application/pdf',
  });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('contracts')
    .update({ original_file_path: path, page_count: pageCount, updated_at: new Date().toISOString() })
    .eq('id', contractId)
    .select()
    .single();
  if (error) throw new Error(translateErrorMessage(error.message));
  return data as Contract;
}

export async function getOriginalPdfUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('contracts').createSignedUrl(path, 3600);
  if (error) throw new Error(translateErrorMessage(error.message));
  return data.signedUrl;
}

// شعار المنشأة (اختياري) يُلحَق بالمستند النهائي بصورة بارزة في كل صفحاته إن
// تعدّدت. يُخزَّن كملف في نفس تخزين الملفات (كالمستند الأصلي)، لا كنص Base64
// ضخم داخل صف العقد، لذا يُرفع فقط بعد إنشاء العقد فعليًا (له معرّف حقيقي).
export async function uploadCompanyLogo(contractId: string, dataUrl: string): Promise<Contract> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const path = `${contractId}/company-logo.png`;
  const { error: uploadError } = await supabase.storage.from('contracts').upload(path, blob, {
    upsert: true,
    contentType: blob.type || 'image/png',
  });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('contracts')
    .update({ company_logo_path: path, updated_at: new Date().toISOString() })
    .eq('id', contractId)
    .select()
    .single();
  if (error) throw new Error(translateErrorMessage(error.message));
  return data as Contract;
}

export async function getCompanyLogoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('contracts').createSignedUrl(path, 3600);
  if (error) throw new Error(translateErrorMessage(error.message));
  return data.signedUrl;
}

export async function listParties(contractId: string): Promise<ContractParty[]> {
  const { data, error } = await supabase
    .from('contract_parties')
    .select('*')
    .eq('contract_id', contractId)
    .order('order_index', { ascending: true });
  if (error) throw new Error(translateErrorMessage(error.message));
  return data as ContractParty[];
}

export interface NewPartyInput {
  role_label: string;
  full_name?: string;
  national_id?: string;
  nationality?: string;
  address?: string;
  email?: string;
  phone?: string;
  order_index: number;
  verification_method?: 'manual' | 'nafath';
  date_of_birth?: string;
  party_type?: 'individual' | 'entity';
  entity_name?: string;
  entity_cr_number?: string;
}

export async function addParty(contractId: string, input: NewPartyInput): Promise<ContractParty> {
  const { data, error } = await supabase
    .from('contract_parties')
    .insert({ contract_id: contractId, ...input })
    .select()
    .single();
  if (error) throw new Error(translateErrorMessage(error.message));
  return data as ContractParty;
}

export async function updateParty(partyId: string, patch: Partial<NewPartyInput>): Promise<ContractParty> {
  const { data, error } = await supabase.from('contract_parties').update(patch).eq('id', partyId).select().single();
  if (error) throw new Error(translateErrorMessage(error.message));
  return data as ContractParty;
}

export async function refreshParty(partyId: string): Promise<ContractParty> {
  const { data, error } = await supabase.from('contract_parties').select('*').eq('id', partyId).single();
  if (error) throw new Error(translateErrorMessage(error.message));
  return data as ContractParty;
}

export async function deleteParty(partyId: string): Promise<void> {
  const { error } = await supabase.from('contract_parties').delete().eq('id', partyId);
  if (error) throw new Error(translateErrorMessage(error.message));
}

export async function listFields(contractId: string): Promise<ContractField[]> {
  const { data, error } = await supabase.from('contract_fields').select('*').eq('contract_id', contractId);
  if (error) throw new Error(translateErrorMessage(error.message));
  return data as ContractField[];
}

export interface NewFieldInput {
  party_id: string;
  field_type: FieldType;
  label: string;
  page_number?: number;
  pos_x?: number;
  pos_y?: number;
  width?: number;
  height?: number;
  anchor_id?: string;
  required: boolean;
  options?: string[] | null;
}

export async function addField(contractId: string, input: NewFieldInput): Promise<ContractField> {
  const { data, error } = await supabase
    .from('contract_fields')
    .insert({ contract_id: contractId, ...input })
    .select()
    .single();
  if (error) throw new Error(translateErrorMessage(error.message));
  return data as ContractField;
}

export async function updateField(fieldId: string, patch: Partial<NewFieldInput>): Promise<void> {
  const { error } = await supabase.from('contract_fields').update(patch).eq('id', fieldId);
  if (error) throw new Error(translateErrorMessage(error.message));
}

export async function deleteField(fieldId: string): Promise<void> {
  const { error } = await supabase.from('contract_fields').delete().eq('id', fieldId);
  if (error) throw new Error(translateErrorMessage(error.message));
}

export async function getContractDetail(contractId: string) {
  const [{ data: contract, error: contractError }, parties, fields, events] = await Promise.all([
    supabase.from('contracts').select('*').eq('id', contractId).single(),
    listParties(contractId),
    listFields(contractId),
    listEvents(contractId),
  ]);
  if (contractError) throw contractError;
  return { contract: contract as Contract, parties, fields, events };
}

export async function listEvents(contractId: string): Promise<ContractEvent[]> {
  const { data, error } = await supabase
    .from('contract_events')
    .select('*')
    .eq('contract_id', contractId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(translateErrorMessage(error.message));
  return data as ContractEvent[];
}

export async function sendContract(contractId: string): Promise<Contract> {
  const { data, error } = await supabase.rpc('send_contract', { p_contract_id: contractId });
  if (error) throw new Error(translateErrorMessage(error.message));

  const { error: fnError } = await supabase.functions.invoke('send-contract-notifications', {
    body: { contract_id: contractId },
  });
  if (fnError) {
    // الحالة تحوّلت لـ pending بنجاح؛ فشل الإشعار لا يُلغي الإرسال، فقط يُعلَم المستخدم.
    console.error('send-contract-notifications failed', fnError);
  }

  return data as Contract;
}

export async function deleteDraftContract(contractId: string): Promise<void> {
  const { error } = await supabase.from('contracts').delete().eq('id', contractId);
  if (error) throw new Error(translateErrorMessage(error.message));
}

// يعيد إرسال رابط التوقيع لأي طرف لم يوقّع بعد (بانتظار التوقيع/تمت
// المشاهدة/مرفوض)، بحد أقصى 3 مرات لكل طرف — انظر resend_signing_link.
export async function resendSigningLink(contractId: string, partyId: string): Promise<ContractParty> {
  const { data, error } = await supabase.rpc('resend_signing_link', { p_party_id: partyId });
  if (error) throw new Error(translateErrorMessage(error.message));

  const { error: fnError } = await supabase.functions.invoke('send-contract-notifications', {
    body: { contract_id: contractId, party_id: partyId },
  });
  if (fnError) {
    console.error('send-contract-notifications failed', fnError);
  }

  return data as ContractParty;
}
