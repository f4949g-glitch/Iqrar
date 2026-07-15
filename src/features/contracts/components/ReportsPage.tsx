import { useEffect, useState } from 'react';
import { FileDown, FileText, Printer } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { formatDate, formatDateTime } from '@/shared/lib/formatDate';
import { exportToCsv, type CsvCell } from '@/shared/lib/exportCsv';
import { exportToPdf } from '@/shared/lib/exportPdf';
import { CONTRACT_STATUS_LABEL, DOCUMENT_TYPE_LABELS, type ContractStatus, type DocumentType } from '../types';
import {
  fetchUsersReport,
  fetchPendingContractsReport,
  fetchPowerOfAttorneyReport,
  fetchPaymentsReport,
  fetchRevenueByDocumentType,
  fetchContractsBreakdown,
  fetchDiscountCodesReport,
  fetchDiscountFinancialImpact,
  fetchCreditCodesReport,
  fetchOverviewStats,
  type UserReportRow,
  type PendingContractRow,
  type PaymentsReport,
  type RevenueByDocumentTypeRow,
  type ContractsBreakdownRow,
  type DiscountCodeReportRow,
  type DiscountFinancialImpact,
  type CreditCodesReportResult,
  type OverviewStats,
} from '../api/reportsApi';

const ROLE_LABEL: Record<string, string> = { admin: 'مدير المنصة', sub_admin: 'أدمن فرعي', member: 'عضو' };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonthIso() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function ExportButton({ icon: Icon, label, onClick }: { icon: typeof FileDown; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="no-print flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs font-bold text-ink hover:bg-paper"
    >
      <Icon size={13} /> {label}
    </button>
  );
}

// زوج أزرار تصدير (Excel وPDF) لجدول واحد، مبنيّان على نفس رؤوس الأعمدة
// والصفوف كي لا تتكرر بيانات كل قسم في مكانين.
function exportButtons(filename: string, headers: string[], rows: CsvCell[][]) {
  return {
    onExportCsv: () => exportToCsv(filename, headers, rows),
    onExportPdf: () => exportToPdf(filename, headers, rows),
  };
}

function DualExportButtons({ filename, headers, rows }: { filename: string; headers: string[]; rows: CsvCell[][] }) {
  const { onExportCsv, onExportPdf } = exportButtons(filename, headers, rows);
  return (
    <div className="flex items-center gap-2">
      <ExportButton icon={FileDown} label="Excel" onClick={onExportCsv} />
      <ExportButton icon={FileText} label="PDF" onClick={onExportPdf} />
    </div>
  );
}

function Card({
  title,
  onExportCsv,
  onExportPdf,
  children,
}: {
  title: string;
  onExportCsv?: () => void;
  onExportPdf?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-sm font-bold text-ink">{title}</h2>
        {(onExportCsv || onExportPdf) && (
          <div className="flex items-center gap-2">
            {onExportCsv && <ExportButton icon={FileDown} label="Excel" onClick={onExportCsv} />}
            {onExportPdf && <ExportButton icon={FileText} label="PDF" onClick={onExportPdf} />}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

// عقود بأطرافها (تقرير العقود المعلّقة/التفويضات) تُصدَّر كصف واحد لكل طرف
// (تتكرر بيانات العقد لكل طرف)، وهو الشكل المعتاد لتفريغ بيانات متداخلة في جدول.
function contractsWithPartiesExportRows(contracts: PendingContractRow[]): CsvCell[][] {
  return contracts.flatMap((c) =>
    (c.parties.length > 0 ? c.parties : [null]).map((p) => [
      c.title,
      DOCUMENT_TYPE_LABELS[c.document_type as DocumentType] ?? c.document_type,
      CONTRACT_STATUS_LABEL[c.status as ContractStatus]?.label ?? c.status,
      c.creator_name,
      c.invoice_amount,
      c.sent_at ? formatDateTime(c.sent_at) : '',
      p?.full_name,
      p?.role_label,
      p?.phone,
      p?.national_id,
      p ? (p.status === 'signed' ? 'وقّع' : p.status === 'viewed' ? 'شاهد' : p.status === 'rejected' ? 'رفض' : 'بانتظار') : '',
    ]),
  );
}
const CONTRACTS_WITH_PARTIES_HEADERS = ['عنوان العقد', 'النوع', 'الحالة', 'المنشئ', 'القيمة', 'تاريخ الإرسال', 'اسم الطرف', 'الصفة', 'الجوال', 'رقم الهوية', 'حالة الطرف'];

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-card p-4 text-center">
      <p className="font-display text-2xl font-extrabold text-seal">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate">{label}</p>
    </div>
  );
}

// عرض قائمة عقود بأطرافها الكاملة — مشترك بين تقرير العقود المعلّقة وتقرير
// التفويضات لتفادي تكرار نفس القالب مرتين.
function ContractsWithPartiesList({ contracts, emptyLabel }: { contracts: PendingContractRow[]; emptyLabel: string }) {
  return (
    <div className="space-y-3">
      {contracts.map((c) => (
        <div key={c.id} className="rounded-lg border border-line p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-ink">
              {c.title} <span className="text-xs font-normal text-slate">({DOCUMENT_TYPE_LABELS[c.document_type as DocumentType]})</span>
            </p>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-bold"
              style={{ background: CONTRACT_STATUS_LABEL[c.status as ContractStatus]?.bg, color: CONTRACT_STATUS_LABEL[c.status as ContractStatus]?.fg }}
            >
              {CONTRACT_STATUS_LABEL[c.status as ContractStatus]?.label ?? c.status}
            </span>
          </div>
          <p className="mb-2 text-xs text-slate">
            المنشئ: {c.creator_name || '—'} · القيمة: {c.invoice_amount?.toFixed(2) ?? '—'} ريال
            {c.sent_at && ` · أُرسل في ${formatDateTime(c.sent_at)}`}
          </p>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-line text-right text-slate">
                <th className="py-1.5 pe-3 font-bold">الطرف</th>
                <th className="py-1.5 pe-3 font-bold">الصفة</th>
                <th className="py-1.5 pe-3 font-bold">الجوال</th>
                <th className="py-1.5 pe-3 font-bold">رقم الهوية</th>
                <th className="py-1.5 font-bold">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {c.parties.map((p, i) => (
                <tr key={i} className="border-b border-line text-ink last:border-0">
                  <td className="py-1.5 pe-3">{p.full_name || '—'}</td>
                  <td className="py-1.5 pe-3">{p.role_label}</td>
                  <td className="py-1.5 pe-3" dir="ltr">
                    {p.phone || '—'}
                  </td>
                  <td className="py-1.5 pe-3" dir="ltr">
                    {p.national_id || '—'}
                  </td>
                  <td className="py-1.5">{p.status === 'signed' ? 'وقّع' : p.status === 'viewed' ? 'شاهد' : p.status === 'rejected' ? 'رفض' : 'بانتظار'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {contracts.length === 0 && <p className="text-sm text-slate">{emptyLabel}</p>}
    </div>
  );
}

type ReportsTab = 'financial' | 'other';
const TABS: { key: ReportsTab; label: string }[] = [
  { key: 'financial', label: 'التقارير المالية' },
  { key: 'other', label: 'تقارير أخرى' },
];

export function ReportsPage() {
  const [tab, setTab] = useState<ReportsTab>('financial');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [users, setUsers] = useState<UserReportRow[]>([]);
  const [pendingContracts, setPendingContracts] = useState<PendingContractRow[]>([]);
  const [poaContracts, setPoaContracts] = useState<PendingContractRow[]>([]);
  const [contractsBreakdown, setContractsBreakdown] = useState<ContractsBreakdownRow[]>([]);
  const [revenueByType, setRevenueByType] = useState<RevenueByDocumentTypeRow[]>([]);
  const [discountCodes, setDiscountCodes] = useState<DiscountCodeReportRow[]>([]);
  const [discountImpact, setDiscountImpact] = useState<DiscountFinancialImpact | null>(null);
  const [creditReport, setCreditReport] = useState<CreditCodesReportResult | null>(null);
  const [paymentsFrom, setPaymentsFrom] = useState(firstOfMonthIso());
  const [paymentsTo, setPaymentsTo] = useState(todayIso());
  const [payments, setPayments] = useState<PaymentsReport | null>(null);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const loadPayments = async () => {
    setLoadingPayments(true);
    try {
      setPayments(await fetchPaymentsReport(paymentsFrom, paymentsTo));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تحميل تقرير المدفوعات');
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [ov, u, pc, poa, cb, rt, dc, di, cc] = await Promise.all([
          fetchOverviewStats(),
          fetchUsersReport(),
          fetchPendingContractsReport(),
          fetchPowerOfAttorneyReport(),
          fetchContractsBreakdown(),
          fetchRevenueByDocumentType(),
          fetchDiscountCodesReport(),
          fetchDiscountFinancialImpact(),
          fetchCreditCodesReport(),
        ]);
        setOverview(ov);
        setUsers(u);
        setPendingContracts(pc);
        setPoaContracts(poa);
        setContractsBreakdown(cb);
        setRevenueByType(rt);
        setDiscountCodes(dc);
        setDiscountImpact(di);
        setCreditReport(cc);
        await loadPayments();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'تعذّر تحميل التقارير');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p className="text-sm text-slate">جارِ تحميل التقارير...</p>;

  const documentTypes: DocumentType[] = ['contract', 'power_of_attorney'];
  const statuses: ContractStatus[] = ['draft', 'pending', 'partially_completed', 'completed', 'expired', 'rejected', 'cancelled'];
  const breakdownCount = (status: ContractStatus, docType: DocumentType) =>
    contractsBreakdown.find((r) => r.status === status && r.document_type === docType)?.count ?? 0;

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">التقارير الإحصائية</h1>
          <p className="mt-1 text-sm text-slate">نظرة شاملة على الجوانب المالية والمستخدمين والعقود والتفويضات</p>
        </div>
        <Button variant="secondary" onClick={() => window.print()}>
          <span className="flex items-center gap-1.5">
            <Printer size={16} /> طباعة التقرير
          </span>
        </Button>
      </div>

      {error && <p className="text-sm font-bold text-clay">{error}</p>}

      {overview && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiTile label="إجمالي المستخدمين" value={String(overview.usersCount)} />
          <KpiTile label="عقود موثّقة" value={String(overview.contractsByStatus.completed ?? 0)} />
          <KpiTile label="عقود معلّقة" value={String((overview.contractsByStatus.pending ?? 0) + (overview.contractsByStatus.partially_completed ?? 0))} />
          <KpiTile label="عقود مسودة" value={String(overview.contractsByStatus.draft ?? 0)} />
          <KpiTile label="إجمالي الإيرادات" value={`${overview.totalRevenue.toFixed(2)} ريال`} />
          <KpiTile label="أكواد خصم/شحن نشطة" value={`${overview.activeDiscountCodes} / ${overview.activeCreditCodes}`} />
        </div>
      )}

      <div className="no-print flex gap-1 overflow-x-auto rounded-lg bg-card p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-md px-4 py-2 text-sm font-bold transition ${tab === t.key ? 'bg-seal text-white' : 'text-slate hover:bg-paper'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'financial' && (
        <>
          <Card
            title="المدفوعات حسب نطاق تاريخ"
            {...exportButtons(
              'المدفوعات',
              ['التاريخ', 'عدد العمليات', 'الإجمالي (ريال)'],
              (payments?.daily ?? []).map((d) => [formatDate(d.date), d.count, d.total]),
            )}
          >
            <div className="no-print mb-4 flex flex-wrap items-end gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-xs font-bold text-slate">من تاريخ</span>
                <input
                  type="date"
                  value={paymentsFrom}
                  onChange={(e) => setPaymentsFrom(e.target.value)}
                  className="rounded-lg border border-line bg-card px-3 py-2 text-ink outline-none focus:border-seal"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-bold text-slate">إلى تاريخ</span>
                <input
                  type="date"
                  value={paymentsTo}
                  onChange={(e) => setPaymentsTo(e.target.value)}
                  className="rounded-lg border border-line bg-card px-3 py-2 text-ink outline-none focus:border-seal"
                />
              </label>
              <Button variant="secondary" onClick={loadPayments} disabled={loadingPayments}>
                {loadingPayments ? 'جارِ التحديث...' : 'تحديث'}
              </Button>
            </div>
            {payments && (
              <>
                <p className="mb-3 text-sm font-bold text-seal">
                  إجمالي الفترة: {payments.total.toFixed(2)} ريال ({payments.count} عملية دفع)
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[400px] border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-line text-right text-slate">
                        <th className="py-2 pe-3 font-bold">التاريخ</th>
                        <th className="py-2 pe-3 font-bold">عدد العمليات</th>
                        <th className="py-2 font-bold">الإجمالي (ريال)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.daily.map((d) => (
                        <tr key={d.date} className="border-b border-line text-ink">
                          <td className="py-2 pe-3">{formatDate(d.date)}</td>
                          <td className="py-2 pe-3">{d.count}</td>
                          <td className="py-2">{d.total.toFixed(2)}</td>
                        </tr>
                      ))}
                      {payments.daily.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-3 text-center text-slate">
                            لا توجد مدفوعات ضمن هذا النطاق
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>

          <Card
            title="الإيرادات حسب نوع الوثيقة"
            {...exportButtons(
              'الإيرادات_حسب_نوع_الوثيقة',
              ['نوع الوثيقة', 'عدد الفواتير', 'الإجمالي (ريال)'],
              documentTypes.map((dt) => {
                const row = revenueByType.find((r) => r.document_type === dt);
                return [DOCUMENT_TYPE_LABELS[dt], row?.count ?? 0, row?.total ?? 0];
              }),
            )}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[360px] border-collapse text-xs">
                <thead>
                  <tr className="border-b border-line text-right text-slate">
                    <th className="py-2 pe-3 font-bold">نوع الوثيقة</th>
                    <th className="py-2 pe-3 font-bold">عدد الفواتير</th>
                    <th className="py-2 font-bold">الإجمالي (ريال)</th>
                  </tr>
                </thead>
                <tbody>
                  {documentTypes.map((dt) => {
                    const row = revenueByType.find((r) => r.document_type === dt);
                    return (
                      <tr key={dt} className="border-b border-line text-ink">
                        <td className="py-2 pe-3 font-bold">{DOCUMENT_TYPE_LABELS[dt]}</td>
                        <td className="py-2 pe-3">{row?.count ?? 0}</td>
                        <td className="py-2">{(row?.total ?? 0).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card
            title="الأثر المالي لأكواد الخصم"
            {...exportButtons(
              'الأثر_المالي_لأكواد_الخصم',
              ['الكود', 'نسبة الخصم', 'عدد العقود', 'الإيراد بعد الخصم', 'قيمة الخصم الممنوح'],
              (discountImpact?.byCode ?? []).map((r) => [r.code, `${r.discount_percent}%`, r.contracts_used_on, r.revenue_after_discount, r.discount_given]),
            )}
          >
            {discountImpact && (
              <p className="mb-3 text-sm font-bold text-seal">
                إجمالي قيمة الخصومات الممنوحة: {discountImpact.totalDiscountGiven.toFixed(2)} ريال · الإيراد الفعلي بعد الخصم:{' '}
                {discountImpact.totalRevenueAfterDiscount.toFixed(2)} ريال
              </p>
            )}
            <div className="overflow-x-auto mb-5">
              <table className="w-full min-w-[560px] border-collapse text-xs">
                <thead>
                  <tr className="border-b border-line text-right text-slate">
                    <th className="py-2 pe-3 font-bold">الكود</th>
                    <th className="py-2 pe-3 font-bold">نسبة الخصم</th>
                    <th className="py-2 pe-3 font-bold">عدد العقود</th>
                    <th className="py-2 pe-3 font-bold">الإيراد بعد الخصم</th>
                    <th className="py-2 font-bold">قيمة الخصم الممنوح</th>
                  </tr>
                </thead>
                <tbody>
                  {(discountImpact?.byCode ?? []).map((r) => (
                    <tr key={r.id} className="border-b border-line text-ink">
                      <td className="py-2 pe-3 font-mono font-bold" dir="ltr">
                        {r.code}
                      </td>
                      <td className="py-2 pe-3">{r.discount_percent}%</td>
                      <td className="py-2 pe-3">{r.contracts_used_on}</td>
                      <td className="py-2 pe-3">{r.revenue_after_discount.toFixed(2)}</td>
                      <td className="py-2">{r.discount_given.toFixed(2)}</td>
                    </tr>
                  ))}
                  {(discountImpact?.byCode.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={5} className="py-3 text-center text-slate">
                        لا توجد أكواد خصم استُخدمت بعد
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-xs font-bold text-ink">كل أكواد الخصم الصادرة ({discountCodes.length})</h3>
              <DualExportButtons
                filename="أكواد_الخصم"
                headers={['الكود', 'الخصم', 'الحالة', 'مرات الاستخدام', 'الحد الأقصى', 'الانتهاء', 'مُنتهٍ؟']}
                rows={discountCodes.map((c) => [
                  c.code,
                  `${c.discount_percent}%`,
                  c.approval_status === 'approved' ? (c.is_active ? 'مُفعَّل' : 'مُعطَّل') : c.approval_status === 'pending' ? 'بانتظار الموافقة' : 'مرفوض',
                  c.uses_count,
                  c.max_uses ?? '',
                  c.ends_at ? formatDate(c.ends_at) : '',
                  c.is_expired ? 'نعم' : 'لا',
                ])}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-xs">
                <thead>
                  <tr className="border-b border-line text-right text-slate">
                    <th className="py-2 pe-3 font-bold">الكود</th>
                    <th className="py-2 pe-3 font-bold">الخصم</th>
                    <th className="py-2 pe-3 font-bold">الحالة</th>
                    <th className="py-2 pe-3 font-bold">مرات الاستخدام</th>
                    <th className="py-2 pe-3 font-bold">الانتهاء</th>
                    <th className="py-2 font-bold">مُنتهٍ؟</th>
                  </tr>
                </thead>
                <tbody>
                  {discountCodes.map((c) => (
                    <tr key={c.id} className="border-b border-line text-ink">
                      <td className="py-2 pe-3 font-mono font-bold" dir="ltr">
                        {c.code}
                      </td>
                      <td className="py-2 pe-3">{c.discount_percent}%</td>
                      <td className="py-2 pe-3">{c.approval_status === 'approved' ? (c.is_active ? 'مُفعَّل' : 'مُعطَّل') : c.approval_status === 'pending' ? 'بانتظار الموافقة' : 'مرفوض'}</td>
                      <td className="py-2 pe-3">
                        {c.uses_count}
                        {c.max_uses !== null && ` / ${c.max_uses}`}
                      </td>
                      <td className="py-2 pe-3">{c.ends_at ? formatDate(c.ends_at) : '—'}</td>
                      <td className="py-2">{c.is_expired ? 'نعم' : 'لا'}</td>
                    </tr>
                  ))}
                  {discountCodes.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-3 text-center text-slate">
                        لا توجد أكواد خصم
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card
            title={`أكواد الشحن / المحفظة (${creditReport?.codes.length ?? 0})`}
            {...exportButtons(
              'أكواد_الشحن',
              ['الكود', 'القيمة', 'الحالة', 'مرات الاستخدام', 'الحد الأقصى'],
              (creditReport?.codes ?? []).map((c) => [c.code, c.amount, c.is_active ? 'مُفعَّل' : 'مُعطَّل', c.uses_count, c.max_uses ?? '']),
            )}
          >
            <div className="overflow-x-auto mb-5">
              <table className="w-full min-w-[480px] border-collapse text-xs">
                <thead>
                  <tr className="border-b border-line text-right text-slate">
                    <th className="py-2 pe-3 font-bold">الكود</th>
                    <th className="py-2 pe-3 font-bold">القيمة</th>
                    <th className="py-2 pe-3 font-bold">الحالة</th>
                    <th className="py-2 font-bold">مرات الاستخدام</th>
                  </tr>
                </thead>
                <tbody>
                  {(creditReport?.codes ?? []).map((c) => (
                    <tr key={c.id} className="border-b border-line text-ink">
                      <td className="py-2 pe-3 font-mono font-bold" dir="ltr">
                        {c.code}
                      </td>
                      <td className="py-2 pe-3">{c.amount.toFixed(2)} ريال</td>
                      <td className="py-2 pe-3">{c.is_active ? 'مُفعَّل' : 'مُعطَّل'}</td>
                      <td className="py-2">
                        {c.uses_count}
                        {c.max_uses !== null && ` / ${c.max_uses}`}
                      </td>
                    </tr>
                  ))}
                  {(creditReport?.codes.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={4} className="py-3 text-center text-slate">
                        لا توجد أكواد شحن
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-xs font-bold text-ink">المستخدمون المستفيدون من الشحن</h3>
              <DualExportButtons
                filename="عمليات_الشحن"
                headers={['المستخدم', 'الجوال', 'الكود', 'المبلغ', 'التاريخ']}
                rows={(creditReport?.redemptions ?? []).map((r) => [r.user_name, r.user_phone, r.code, r.amount, formatDateTime(r.created_at)])}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-xs">
                <thead>
                  <tr className="border-b border-line text-right text-slate">
                    <th className="py-2 pe-3 font-bold">المستخدم</th>
                    <th className="py-2 pe-3 font-bold">الجوال</th>
                    <th className="py-2 pe-3 font-bold">الكود</th>
                    <th className="py-2 pe-3 font-bold">المبلغ</th>
                    <th className="py-2 font-bold">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {(creditReport?.redemptions ?? []).map((r) => (
                    <tr key={r.id} className="border-b border-line text-ink">
                      <td className="py-2 pe-3">{r.user_name || '—'}</td>
                      <td className="py-2 pe-3" dir="ltr">
                        {r.user_phone || '—'}
                      </td>
                      <td className="py-2 pe-3 font-mono" dir="ltr">
                        {r.code}
                      </td>
                      <td className="py-2 pe-3">{r.amount.toFixed(2)} ريال</td>
                      <td className="py-2">{formatDateTime(r.created_at)}</td>
                    </tr>
                  ))}
                  {(creditReport?.redemptions.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={5} className="py-3 text-center text-slate">
                        لا توجد عمليات شحن بعد
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {tab === 'other' && (
        <>
          <Card
            title={`المستخدمون وأعمالهم (${users.length})`}
            {...exportButtons(
              'المستخدمون',
              ['الاسم', 'رقم الهوية', 'الجوال', 'البريد', 'الصفة', 'عقود موثّقة', 'وقّع كطرف', 'الرصيد', 'تاريخ التسجيل'],
              users.map((u) => [
                u.full_name,
                u.national_id,
                u.phone,
                u.email,
                ROLE_LABEL[u.role] ?? u.role,
                u.contracts_completed,
                u.contracts_signed_as_party,
                u.credit_balance,
                formatDate(u.created_at),
              ]),
            )}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-xs">
                <thead>
                  <tr className="border-b border-line text-right text-slate">
                    <th className="py-2 pe-3 font-bold">الاسم</th>
                    <th className="py-2 pe-3 font-bold">رقم الهوية</th>
                    <th className="py-2 pe-3 font-bold">الجوال</th>
                    <th className="py-2 pe-3 font-bold">البريد</th>
                    <th className="py-2 pe-3 font-bold">الصفة</th>
                    <th className="py-2 pe-3 font-bold">عقود موثّقة</th>
                    <th className="py-2 pe-3 font-bold">وقّع كطرف</th>
                    <th className="py-2 pe-3 font-bold">الرصيد</th>
                    <th className="py-2 font-bold">تاريخ التسجيل</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-line text-ink">
                      <td className="py-2 pe-3 font-bold">{u.full_name || '—'}</td>
                      <td className="py-2 pe-3" dir="ltr">
                        {u.national_id || '—'}
                      </td>
                      <td className="py-2 pe-3" dir="ltr">
                        {u.phone || '—'}
                      </td>
                      <td className="py-2 pe-3" dir="ltr">
                        {u.email}
                      </td>
                      <td className="py-2 pe-3">{ROLE_LABEL[u.role] ?? u.role}</td>
                      <td className="py-2 pe-3">{u.contracts_completed}</td>
                      <td className="py-2 pe-3">{u.contracts_signed_as_party}</td>
                      <td className="py-2 pe-3">{u.credit_balance.toFixed(2)}</td>
                      <td className="py-2">{formatDate(u.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card
            title="العقود حسب الحالة ونوع الوثيقة"
            {...exportButtons(
              'العقود_حسب_الحالة_والنوع',
              ['الحالة', ...documentTypes.map((dt) => DOCUMENT_TYPE_LABELS[dt]), 'الإجمالي'],
              statuses.map((st) => [
                CONTRACT_STATUS_LABEL[st]?.label ?? st,
                ...documentTypes.map((dt) => breakdownCount(st, dt)),
                documentTypes.reduce((sum, dt) => sum + breakdownCount(st, dt), 0),
              ]),
            )}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-xs">
                <thead>
                  <tr className="border-b border-line text-right text-slate">
                    <th className="py-2 pe-3 font-bold">الحالة</th>
                    {documentTypes.map((dt) => (
                      <th key={dt} className="py-2 pe-3 font-bold">
                        {DOCUMENT_TYPE_LABELS[dt]}
                      </th>
                    ))}
                    <th className="py-2 font-bold">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {statuses.map((st) => {
                    const rowTotal = documentTypes.reduce((sum, dt) => sum + breakdownCount(st, dt), 0);
                    return (
                      <tr key={st} className="border-b border-line text-ink">
                        <td className="py-2 pe-3 font-bold">{CONTRACT_STATUS_LABEL[st]?.label ?? st}</td>
                        {documentTypes.map((dt) => (
                          <td key={dt} className="py-2 pe-3">
                            {breakdownCount(st, dt)}
                          </td>
                        ))}
                        <td className="py-2 font-bold">{rowTotal}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card
            title={`تقرير التفويضات (${poaContracts.length})`}
            {...exportButtons('تقرير_التفويضات', CONTRACTS_WITH_PARTIES_HEADERS, contractsWithPartiesExportRows(poaContracts))}
          >
            <ContractsWithPartiesList contracts={poaContracts} emptyLabel="لا توجد تفويضات مُصدَرة حتى الآن" />
          </Card>

          <Card
            title={`العقود المعلّقة (${pendingContracts.length})`}
            {...exportButtons('العقود_المعلقة', CONTRACTS_WITH_PARTIES_HEADERS, contractsWithPartiesExportRows(pendingContracts))}
          >
            <ContractsWithPartiesList contracts={pendingContracts} emptyLabel="لا توجد عقود معلّقة حاليًا" />
          </Card>
        </>
      )}
    </div>
  );
}
