import { supabase } from '@/lib/supabase/client';

export interface UserReportRow {
  id: string;
  full_name: string | null;
  national_id: string | null;
  phone: string | null;
  email: string;
  role: string;
  credit_balance: number;
  created_at: string;
  contracts_created: number;
  contracts_completed: number;
  contracts_signed_as_party: number;
}

// تقرير المستخدمين: بياناتهم الكاملة مع عدد العقود التي أنشأها/وثّقها كل واحد
// منهم، وعدد المرات التي وقّع فيها كطرف في عقود أنشأها آخرون.
export async function fetchUsersReport(): Promise<UserReportRow[]> {
  const [{ data: profiles, error: profilesError }, { data: contracts, error: contractsError }, { data: parties, error: partiesError }] =
    await Promise.all([
      supabase.from('profiles').select('id, full_name, national_id, phone, email, role, credit_balance, created_at'),
      supabase.from('contracts').select('created_by, status'),
      supabase.from('contract_parties').select('user_id, status'),
    ]);
  if (profilesError) throw profilesError;
  if (contractsError) throw contractsError;
  if (partiesError) throw partiesError;

  return (profiles ?? []).map((p) => ({
    ...p,
    contracts_created: (contracts ?? []).filter((c) => c.created_by === p.id).length,
    contracts_completed: (contracts ?? []).filter((c) => c.created_by === p.id && c.status === 'completed').length,
    contracts_signed_as_party: (parties ?? []).filter((pt) => pt.user_id === p.id && pt.status === 'signed').length,
  })) as UserReportRow[];
}

export interface PendingContractPartyRow {
  full_name: string | null;
  national_id: string | null;
  phone: string | null;
  role_label: string;
  status: string;
}

export interface PendingContractRow {
  id: string;
  title: string;
  status: string;
  document_type: string;
  invoice_amount: number | null;
  sent_at: string | null;
  creator_name: string | null;
  parties: PendingContractPartyRow[];
}

// تقرير العقود المعلّقة (بانتظار التوقيع أو مكتملة جزئيًا) بأسماء أطرافها
// وأرقام جوالاتهم وبياناتهم، لمتابعة ما لم يُستكمل توثيقه بعد.
export async function fetchPendingContractsReport(): Promise<PendingContractRow[]> {
  const [{ data: contracts, error: contractsError }, { data: parties, error: partiesError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      supabase
        .from('contracts')
        .select('id, title, status, document_type, invoice_amount, sent_at, created_by')
        .in('status', ['pending', 'partially_completed'])
        .order('sent_at', { ascending: false }),
      supabase.from('contract_parties').select('contract_id, full_name, national_id, phone, role_label, status'),
      supabase.from('profiles').select('id, full_name'),
    ]);
  if (contractsError) throw contractsError;
  if (partiesError) throw partiesError;
  if (profilesError) throw profilesError;

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return (contracts ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status,
    document_type: c.document_type,
    invoice_amount: c.invoice_amount,
    sent_at: c.sent_at,
    creator_name: nameById.get(c.created_by) ?? null,
    parties: (parties ?? [])
      .filter((pt) => pt.contract_id === c.id)
      .map((pt) => ({ full_name: pt.full_name, national_id: pt.national_id, phone: pt.phone, role_label: pt.role_label, status: pt.status })),
  }));
}

export interface DailyPayment {
  date: string;
  total: number;
  count: number;
}

export interface PaymentsReport {
  daily: DailyPayment[];
  total: number;
  count: number;
}

// تقرير المبالغ المالية المدفوعة (فاتورة كل عقد أُرسل للتوثيق) ضمن نطاق تاريخ،
// مجمّعة يوميًا وبإجمالي الفترة كاملة.
export async function fetchPaymentsReport(from: string, to: string): Promise<PaymentsReport> {
  const toExclusive = new Date(new Date(to).getTime() + 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('contracts')
    .select('invoice_amount, sent_at')
    .not('sent_at', 'is', null)
    .not('invoice_amount', 'is', null)
    .gte('sent_at', new Date(from).toISOString())
    .lt('sent_at', toExclusive)
    .order('sent_at', { ascending: true });
  if (error) throw error;

  const byDay = new Map<string, DailyPayment>();
  let total = 0;
  for (const row of data ?? []) {
    const day = String(row.sent_at).slice(0, 10);
    const amount = Number(row.invoice_amount ?? 0);
    total += amount;
    const existing = byDay.get(day);
    if (existing) {
      existing.total += amount;
      existing.count += 1;
    } else {
      byDay.set(day, { date: day, total: amount, count: 1 });
    }
  }

  return { daily: Array.from(byDay.values()), total, count: (data ?? []).length };
}

export interface DiscountCodeReportRow {
  id: string;
  code: string;
  discount_percent: number;
  is_active: boolean;
  approval_status: string;
  ends_at: string | null;
  max_uses: number | null;
  uses_count: number;
  is_expired: boolean;
}

// تقرير أكواد الخصم: كل كود صادر مع عدد مرات استخدامه الفعلي وحالة انتهائه.
export async function fetchDiscountCodesReport(): Promise<DiscountCodeReportRow[]> {
  const [{ data: codes, error: codesError }, { data: uses, error: usesError }] = await Promise.all([
    supabase.from('discount_codes').select('id, code, discount_percent, is_active, approval_status, ends_at, max_uses').order('created_at', { ascending: false }),
    supabase.from('discount_code_uses').select('discount_code_id'),
  ]);
  if (codesError) throw codesError;
  if (usesError) throw usesError;

  const now = Date.now();
  return (codes ?? []).map((c) => ({
    ...c,
    uses_count: (uses ?? []).filter((u) => u.discount_code_id === c.id).length,
    is_expired: Boolean(c.ends_at && new Date(c.ends_at).getTime() < now),
  }));
}

export interface CreditRedemptionRow {
  id: string;
  amount: number;
  created_at: string;
  user_name: string | null;
  user_phone: string | null;
  code: string;
}

export interface CreditCodesReportResult {
  codes: { id: string; code: string; amount: number; max_uses: number | null; uses_count: number; is_active: boolean; created_at: string }[];
  redemptions: CreditRedemptionRow[];
}

// تقرير أكواد الشحن: الأكواد الصادرة، والمستخدمين المستفيدين من كل عملية شحن.
export async function fetchCreditCodesReport(): Promise<CreditCodesReportResult> {
  const [{ data: codes, error: codesError }, { data: redemptions, error: redemptionsError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      supabase.from('credit_codes').select('*').order('created_at', { ascending: false }),
      supabase.from('credit_code_redemptions').select('id, credit_code_id, redeemed_by, amount, created_at').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, phone'),
    ]);
  if (codesError) throw codesError;
  if (redemptionsError) throw redemptionsError;
  if (profilesError) throw profilesError;

  const codeById = new Map((codes ?? []).map((c) => [c.id, c.code]));
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return {
    codes: codes ?? [],
    redemptions: (redemptions ?? []).map((r) => ({
      id: r.id,
      amount: r.amount,
      created_at: r.created_at,
      user_name: profileById.get(r.redeemed_by)?.full_name ?? null,
      user_phone: profileById.get(r.redeemed_by)?.phone ?? null,
      code: codeById.get(r.credit_code_id) ?? '—',
    })),
  };
}

export interface OverviewStats {
  usersCount: number;
  contractsByStatus: Record<string, number>;
  totalRevenue: number;
  activeDiscountCodes: number;
  activeCreditCodes: number;
}

// ملخص أرقام عامة (KPIs) تُعرض أعلى صفحة التقارير.
export async function fetchOverviewStats(): Promise<OverviewStats> {
  const [{ data: profiles, error: profilesError }, { data: contracts, error: contractsError }, { data: discountCodes, error: discountError }, { data: creditCodes, error: creditError }] =
    await Promise.all([
      supabase.from('profiles').select('id'),
      supabase.from('contracts').select('status, invoice_amount'),
      supabase.from('discount_codes').select('is_active'),
      supabase.from('credit_codes').select('is_active'),
    ]);
  if (profilesError) throw profilesError;
  if (contractsError) throw contractsError;
  if (discountError) throw discountError;
  if (creditError) throw creditError;

  const contractsByStatus: Record<string, number> = {};
  let totalRevenue = 0;
  for (const c of contracts ?? []) {
    contractsByStatus[c.status] = (contractsByStatus[c.status] ?? 0) + 1;
    if (c.invoice_amount) totalRevenue += Number(c.invoice_amount);
  }

  return {
    usersCount: (profiles ?? []).length,
    contractsByStatus,
    totalRevenue,
    activeDiscountCodes: (discountCodes ?? []).filter((c) => c.is_active).length,
    activeCreditCodes: (creditCodes ?? []).filter((c) => c.is_active).length,
  };
}
