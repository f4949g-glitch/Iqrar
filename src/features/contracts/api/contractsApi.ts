import { supabase } from '@/lib/supabase/client';
import type { Contract, ContractEvent, ContractField, ContractParty, FieldType } from '../types';

export interface ContractListItem extends Contract {
  parties_count: number;
  signed_count: number;
}

async function withPartyCounts(contracts: Contract[]): Promise<ContractListItem[]> {
  if (contracts.length === 0) return [];
  const ids = contracts.map((c) => c.id);
  const { data, error } = await supabase.from('contract_parties').select('contract_id, status').in('contract_id', ids);
  if (error) throw error;

  return contracts.map((c) => {
    const parties = (data ?? []).filter((p) => p.contract_id === c.id);
    return {
      ...c,
      parties_count: parties.length,
      signed_count: parties.filter((p) => p.status === 'signed').length,
    };
  });
}

export async function listActiveContracts(): Promise<ContractListItem[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .in('status', ['draft', 'pending', 'partially_completed'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return withPartyCounts((data ?? []) as Contract[]);
}

export async function listPreviousContracts(): Promise<ContractListItem[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .in('status', ['completed', 'expired', 'rejected', 'cancelled'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return withPartyCounts((data ?? []) as Contract[]);
}

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

  const { data, error } = await supabase.from('contracts').select('*').in('id', contractIds);
  if (error) throw error;
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
  if (error) throw error;
  return data as Contract;
}

export async function saveContractBody(contractId: string, bodyJson: unknown): Promise<Contract> {
  const { data, error } = await supabase
    .from('contracts')
    .update({ body_json: bodyJson as never, updated_at: new Date().toISOString() })
    .eq('id', contractId)
    .select()
    .single();
  if (error) throw error;
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
  if (error) throw error;
  return data as Contract;
}

export async function getOriginalPdfUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('contracts').createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function listParties(contractId: string): Promise<ContractParty[]> {
  const { data, error } = await supabase
    .from('contract_parties')
    .select('*')
    .eq('contract_id', contractId)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data as ContractParty[];
}

export interface NewPartyInput {
  role_label: string;
  full_name: string;
  national_id?: string;
  email?: string;
  phone?: string;
  order_index: number;
}

export async function addParty(contractId: string, input: NewPartyInput): Promise<ContractParty> {
  const { data, error } = await supabase
    .from('contract_parties')
    .insert({ contract_id: contractId, ...input })
    .select()
    .single();
  if (error) throw error;
  return data as ContractParty;
}

export async function deleteParty(partyId: string): Promise<void> {
  const { error } = await supabase.from('contract_parties').delete().eq('id', partyId);
  if (error) throw error;
}

export async function listFields(contractId: string): Promise<ContractField[]> {
  const { data, error } = await supabase.from('contract_fields').select('*').eq('contract_id', contractId);
  if (error) throw error;
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
  if (error) throw error;
  return data as ContractField;
}

export async function updateField(fieldId: string, patch: Partial<NewFieldInput>): Promise<void> {
  const { error } = await supabase.from('contract_fields').update(patch).eq('id', fieldId);
  if (error) throw error;
}

export async function deleteField(fieldId: string): Promise<void> {
  const { error } = await supabase.from('contract_fields').delete().eq('id', fieldId);
  if (error) throw error;
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
  if (error) throw error;
  return data as ContractEvent[];
}

export async function sendContract(contractId: string): Promise<Contract> {
  const { data, error } = await supabase.rpc('send_contract', { p_contract_id: contractId });
  if (error) throw error;

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
  if (error) throw error;
}
