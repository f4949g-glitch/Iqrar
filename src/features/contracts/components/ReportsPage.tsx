import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { formatDate, formatDateTime } from '@/shared/lib/formatDate';
import { CONTRACT_STATUS_LABEL, DOCUMENT_TYPE_LABELS, type ContractStatus, type DocumentType } from '../types';
import {
  fetchUsersReport,
  fetchPendingContractsReport,
  fetchPaymentsReport,
  fetchDiscountCodesReport,
  fetchCreditCodesReport,
  fetchOverviewStats,
  type UserReportRow,
  type PendingContractRow,
  type PaymentsReport,
  type DiscountCodeReportRow,
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-card p-5">
      <h2 className="mb-4 font-display text-sm font-bold text-ink">{title}</h2>
      {children}
    </div>
  );
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-card p-4 text-center">
      <p className="font-display text-2xl font-extrabold text-seal">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate">{label}</p>
    </div>
  );
}

export function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [users, setUsers] = useState<UserReportRow[]>([]);
  const [pendingContracts, setPendingContracts] = useState<PendingContractRow[]>([]);
  const [discountCodes, setDiscountCodes] = useState<DiscountCodeReportRow[]>([]);
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
        const [ov, u, pc, dc, cc] = await Promise.all([
          fetchOverviewStats(),
          fetchUsersReport(),
          fetchPendingContractsReport(),
          fetchDiscountCodesReport(),
          fetchCreditCodesReport(),
        ]);
        setOverview(ov);
        setUsers(u);
        setPendingContracts(pc);
        setDiscountCodes(dc);
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

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">التقارير الإحصائية</h1>
          <p className="mt-1 text-sm text-slate">نظرة شاملة على المستخدمين والعقود والمدفوعات وأكواد الخصم والشحن</p>
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
          <KpiTile label="عقود معلّقة" value={String((overview.contractsByStatus.pending ?? 0) + (overview.contractsByStatus.partially_completed ?? 0)) } />
          <KpiTile label="عقود مسودة" value={String(overview.contractsByStatus.draft ?? 0)} />
          <KpiTile label="إجمالي الإيرادات" value={`${overview.totalRevenue.toFixed(2)} ريال`} />
          <KpiTile label="أكواد خصم/شحن نشطة" value={`${overview.activeDiscountCodes} / ${overview.activeCreditCodes}`} />
        </div>
      )}

      <Card title="المدفوعات حسب نطاق تاريخ">
        <div className="no-print mb-4 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-bold text-slate">من تاريخ</span>
            <input
              type="date"
              value={paymentsFrom}
              onChange={(e) => setPaymentsFrom(e.target.value)}
              className="rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-seal"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-bold text-slate">إلى تاريخ</span>
            <input
              type="date"
              value={paymentsTo}
              onChange={(e) => setPaymentsTo(e.target.value)}
              className="rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-seal"
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

      <Card title={`المستخدمون (${users.length})`}>
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

      <Card title={`العقود المعلّقة (${pendingContracts.length})`}>
        <div className="space-y-3">
          {pendingContracts.map((c) => (
            <div key={c.id} className="rounded-lg border border-line p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-ink">
                  {c.title} <span className="text-xs font-normal text-slate">({DOCUMENT_TYPE_LABELS[c.document_type as DocumentType]})</span>
                </p>
                <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: CONTRACT_STATUS_LABEL[c.status as ContractStatus]?.bg, color: CONTRACT_STATUS_LABEL[c.status as ContractStatus]?.fg }}>
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
          {pendingContracts.length === 0 && <p className="text-sm text-slate">لا توجد عقود معلّقة حاليًا</p>}
        </div>
      </Card>

      <Card title={`أكواد الخصم (${discountCodes.length})`}>
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

      <Card title={`أكواد الشحن (${creditReport?.codes.length ?? 0})`}>
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

        <h3 className="mb-3 font-display text-xs font-bold text-ink">المستخدمون المستفيدون من الشحن</h3>
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
    </div>
  );
}
