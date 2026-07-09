import { supabase } from '@/lib/supabase/client';

export interface VerifyPartyRow {
  party_full_name: string | null;
  party_role_label: string;
  party_status: string;
  party_signed_at: string | null;
}

export interface VerifyResult {
  title: string;
  document_type: 'contract' | 'power_of_attorney';
  verification_number: string;
  completed_at: string;
  parties: VerifyPartyRow[];
}

export interface VerifyInput {
  verificationNumber: string;
  nationalId1: string;
  nationalId2?: string;
  completedDate?: string;
}

export async function verifyDocument(input: VerifyInput): Promise<VerifyResult> {
  const { data, error } = await supabase.rpc('verify_document', {
    p_verification_number: input.verificationNumber.trim(),
    p_national_id_1: input.nationalId1.trim(),
    p_national_id_2: input.nationalId2?.trim() || undefined,
    p_completed_date: input.completedDate || undefined,
  });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<{
    title: string;
    document_type: 'contract' | 'power_of_attorney';
    verification_number: string;
    completed_at: string;
    party_full_name: string | null;
    party_role_label: string;
    party_status: string;
    party_signed_at: string | null;
  }>;
  if (rows.length === 0) throw new Error('لم يتم العثور على توثيق مطابق للبيانات المدخلة');
  return {
    title: rows[0].title,
    document_type: rows[0].document_type,
    verification_number: rows[0].verification_number,
    completed_at: rows[0].completed_at,
    parties: rows.map((r) => ({
      party_full_name: r.party_full_name,
      party_role_label: r.party_role_label,
      party_status: r.party_status,
      party_signed_at: r.party_signed_at,
    })),
  };
}
