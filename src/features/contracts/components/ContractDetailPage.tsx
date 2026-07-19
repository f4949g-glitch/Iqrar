import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  History,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { StatusPill } from '@/shared/ui/StatusPill';
import { Field } from '@/shared/ui/Field';
import { Button } from '@/shared/ui/Button';
import { GregorianDateInput } from '@/shared/ui/GregorianDateInput';
import type { TermMode } from './wizard/PartiesStep';
import {
  getContractDetail,
  updateContractMeta,
  addParty,
  updateParty,
  deleteParty,
  sendContract,
  resendSigningLink,
  type NewPartyInput,
} from '../api/contractsApi';
import { supabase } from '@/lib/supabase/client';
import { renderContractHtml, renderPartiesHeaderHtml, renderTermLineHtml, escapeHtml, type JsonNode } from '../editor/renderContractHtml';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import { formatDate, formatDateTime } from '@/shared/lib/formatDate';
import { parseUserAgent } from '@/shared/lib/parseUserAgent';
import {
  CONTRACT_STATUS_LABEL,
  DOCUMENT_TYPE_LABELS,
  PARTY_STATUS_LABEL,
  PARTY_ROLE_OPTIONS,
  TERM_UNIT_LABELS,
  type Contract,
  type ContractEvent,
  type ContractParty,
  type TermUnit,
} from '../types';

// أيقونة ولون لكل نوع حدث في سجل الأحداث، لتمييز الأحداث الإيجابية (توقيع/اكتمال)
// عن التحذيرية (رفض/فشل) عن المحايدة (مشاهدة/إعادة إرسال) بنظرة سريعة بدل نص مسطّح.
const EVENT_TYPE_META: Record<string, { icon: LucideIcon; className: string }> = {
  viewed: { icon: Eye, className: 'text-slate' },
  party_signed: { icon: CheckCircle2, className: 'text-emerald-600' },
  completed: { icon: CheckCircle2, className: 'text-emerald-600' },
  party_rejected: { icon: XCircle, className: 'text-clay' },
  completion_failed: { icon: AlertTriangle, className: 'text-clay' },
  resent_to_party: { icon: Send, className: 'text-seal' },
  next_turn_notified: { icon: Bell, className: 'text-seal' },
  admin_correction: { icon: ShieldCheck, className: 'text-slate' },
};
const DEFAULT_EVENT_META: { icon: LucideIcon; className: string } = { icon: History, className: 'text-slate' };

const PRINT_STYLES = `
  body { font-family: 'Tajawal', 'Arial', sans-serif; color: #000; padding: 32px; line-height: 1.8; }
  h1.contract-title { font-size: 22px; margin-bottom: 16px; }
  p.contract-term { font-size: 13px; font-weight: bold; margin-bottom: 16px; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 13px; }
  th, td { border: 1px solid #999; padding: 6px 10px; text-align: right; color: #000; }
  th { background: #f0f0f0; }
  .signature-audit { font-size: 10px; color: #555; }
  .fill-image { max-height: 70px; }
  .verification-footer { display: flex; align-items: center; gap: 16px; margin-top: 24px; padding: 12px 16px; border: 1px solid #999; border-radius: 12px; }
  .verification-qr svg { width: 90px; height: 90px; }
  .verification-info p { margin: 2px 0; font-size: 12px; }
  .company-logo { text-align: center; margin-bottom: 16px; }
  .company-logo img { max-height: 90px; max-width: 220px; object-fit: contain; }
`;

function copyLink(token: string) {
  const url = `${window.location.origin}/sign/${token}`;
  navigator.clipboard.writeText(url).catch(() => {});
}

function emptyDraftParty(orderIndex: number): NewPartyInput {
  return { role_label: 'الطرف الأول', full_name: '', order_index: orderIndex };
}

export function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [parties, setParties] = useState<ContractParty[]>([]);
  const [events, setEvents] = useState<ContractEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editTermMode, setEditTermMode] = useState<TermMode>('none');
  const [editTermValue, setEditTermValue] = useState('');
  const [editTermUnit, setEditTermUnit] = useState<TermUnit>('month');
  const [editTermEndDate, setEditTermEndDate] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);
  const [sending, setSending] = useState(false);
  const [resendPickerOpen, setResendPickerOpen] = useState(false);
  const [resendSelectedIds, setResendSelectedIds] = useState<string[]>([]);
  const [resendBusy, setResendBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const detail = await getContractDetail(id);
      setContract(detail.contract);
      setParties(detail.parties);
      setEvents(detail.events);
      setEditTitle(detail.contract.title);
      setEditDuration(detail.contract.duration_days ? String(detail.contract.duration_days) : '');
      if (detail.contract.term_value && detail.contract.term_unit) {
        setEditTermMode('duration');
        setEditTermValue(String(detail.contract.term_value));
        setEditTermUnit(detail.contract.term_unit);
      } else if (detail.contract.term_end_date) {
        setEditTermMode('date');
        setEditTermEndDate(detail.contract.term_end_date);
      } else {
        setEditTermMode('none');
      }
      if (detail.contract.final_file_path) {
        const { data } = await supabase.storage.from('contracts').createSignedUrl(detail.contract.final_file_path, 3600);
        if (data) setDownloadUrl(data.signedUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تحميل العقد');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const previewHtml = useMemo(() => {
    if (!contract || contract.source_type !== 'editor') return '';
    if (contract.status === 'completed' && contract.final_html) return contract.final_html;
    if (!contract.body_json) return '';
    return renderTermLineHtml(contract) + renderPartiesHeaderHtml(parties) + renderContractHtml(contract.body_json as JsonNode, parties);
  }, [contract, parties]);

  const printFinal = () => {
    if (!contract?.final_html) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(
      `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${escapeHtml(contract.title)}</title><style>${PRINT_STYLES}</style></head><body>${contract.final_html}</body></html>`,
    );
    win.document.close();
    win.focus();
    win.print();
  };

  const saveMeta = async () => {
    if (!contract) return;
    setSavingMeta(true);
    setError('');
    try {
      const updated = await updateContractMeta(contract.id, {
        title: editTitle.trim(),
        duration_days: editDuration ? Number(editDuration) : null,
        term_value: editTermMode === 'duration' && editTermValue ? Number(editTermValue) : null,
        term_unit: editTermMode === 'duration' && editTermValue ? editTermUnit : null,
        term_end_date: editTermMode === 'date' && editTermEndDate ? editTermEndDate : null,
      });
      setContract(updated);
    } catch (err) {
      setError(getErrorMessage(err, 'تعذّر حفظ التعديلات'));
    } finally {
      setSavingMeta(false);
    }
  };

  const patchParty = async (partyId: string, patch: Partial<NewPartyInput>) => {
    setParties((prev) => prev.map((p) => (p.id === partyId ? { ...p, ...patch } : p) as ContractParty));
    try {
      await updateParty(partyId, patch);
    } catch (err) {
      setError(getErrorMessage(err, 'تعذّر تحديث بيانات الطرف'));
    }
  };

  const addDraftParty = async () => {
    if (!contract) return;
    try {
      const created = await addParty(contract.id, emptyDraftParty(parties.length));
      setParties((prev) => [...prev, created]);
    } catch (err) {
      setError(getErrorMessage(err, 'تعذّر إضافة طرف'));
    }
  };

  const removeDraftParty = async (partyId: string) => {
    try {
      await deleteParty(partyId);
      setParties((prev) => prev.filter((p) => p.id !== partyId));
    } catch (err) {
      setError(getErrorMessage(err, 'تعذّر حذف الطرف'));
    }
  };

  const send = async () => {
    if (!contract) return;
    setSending(true);
    setError('');
    try {
      await sendContract(contract.id);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'تعذّر إرسال العقد'));
    } finally {
      setSending(false);
    }
  };

  // زر "إعادة إرسال الرابط" العام يعمل لأي طرف لم يوقّع بعد (بانتظار
  // التوقيع/تمت المشاهدة/مرفوض)؛ عند وجود طرف مؤهَّل واحد فقط يُرسَل له مباشرة،
  // وعند تعدّدهم تُفتح لائحة اختيار بدل تخمين المقصود.
  const eligibleResendParties = parties.filter((p) => p.status !== 'signed');

  const toggleResendSelection = (partyId: string) => {
    setResendSelectedIds((prev) => (prev.includes(partyId) ? prev.filter((id) => id !== partyId) : [...prev, partyId]));
  };

  const resendToParties = async (partyIds: string[]) => {
    if (!contract || partyIds.length === 0) return;
    setResendBusy(true);
    setError('');
    try {
      for (const partyId of partyIds) {
        await resendSigningLink(contract.id, partyId);
      }
      setResendPickerOpen(false);
      setResendSelectedIds([]);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'تعذّر إعادة الإرسال'));
    } finally {
      setResendBusy(false);
    }
  };

  const openResendPicker = () => {
    if (eligibleResendParties.length === 1) {
      resendToParties([eligibleResendParties[0].id]);
      return;
    }
    setResendSelectedIds([]);
    setResendPickerOpen(true);
  };

  if (loading) return <p className="text-sm text-slate">جارِ التحميل...</p>;
  if (error && !contract) return <p className="text-sm font-bold text-clay">{error}</p>;
  if (!contract) return null;

  const isDraft = contract.status === 'draft';
  // عقد مرفوض من أحد الأطراف أو منتهي الصلاحية ليس نهاية المطاف: يمكن لمنشئ
  // العقد تعديل بياناته (والأطراف التي لم توقّع بعد) ثم إعادة إرسال رابط
  // التوقيع — زر "إعادة إرسال الرابط" الموجود أصلًا يُعيد حالة العقد نفسه إلى
  // "بانتظار التوقيع" تلقائيًا.
  const isRejected = contract.status === 'rejected';
  const isExpired = contract.status === 'expired';
  const canEditMeta = isDraft || isRejected || isExpired;
  const info = CONTRACT_STATUS_LABEL[contract.status];
  const termLabel =
    contract.term_value && contract.term_unit
      ? `${contract.term_value} ${TERM_UNIT_LABELS[contract.term_unit]}`
      : contract.term_end_date
        ? `حتى ${formatDate(contract.term_end_date)}`
        : null;
  const signedCount = parties.filter((p) => p.status === 'signed').length;
  const progress = parties.length > 0 ? Math.round((signedCount / parties.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">{contract.title}</h1>
          <p className="mt-1 text-xs text-slate">
            أُنشئ في {formatDateTime(contract.created_at)}
            {contract.expires_at && ` · ينتهي في ${formatDate(contract.expires_at)}`}
            {contract.invoice_amount !== null && ` · الفاتورة: ${contract.invoice_amount.toFixed(2)} ريال`}
          </p>
          {termLabel && <p className="mt-1 text-xs text-slate">مدة سريان العقد: {termLabel}</p>}
          {contract.verification_number && (
            <p className="mt-1 text-xs font-bold text-seal">
              رقم التوثيق: <span dir="ltr">{contract.verification_number}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <StatusPill label={info.label} bg={info.bg} fg={info.fg} />
          {!isDraft && eligibleResendParties.length > 0 && (
            <button
              type="button"
              onClick={openResendPicker}
              disabled={resendBusy}
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-bold text-ink hover:bg-paper disabled:opacity-50"
            >
              <RefreshCw size={14} /> {resendBusy ? 'جارِ الإرسال...' : 'إعادة إرسال الرابط'}
            </button>
          )}
          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg bg-sage px-3 py-1.5 text-sm font-bold text-white"
            >
              <Download size={14} /> تحميل النسخة النهائية
            </a>
          )}
          {contract.final_html && (
            <button type="button" onClick={printFinal} className="flex items-center gap-1.5 rounded-lg bg-sage px-3 py-1.5 text-sm font-bold text-white">
              <Printer size={14} /> طباعة/تنزيل PDF
            </button>
          )}
        </div>
      </div>

      {resendPickerOpen && (
        <div className="rounded-xl border border-line bg-card p-5">
          <h2 className="mb-3 font-display text-sm font-bold text-ink">اختر الأطراف لإعادة إرسال رابط التوقيع لهم</h2>
          <div className="space-y-2">
            {eligibleResendParties.map((p) => {
              const exhausted = p.reject_resend_count >= 3;
              return (
                <label
                  key={p.id}
                  className={`flex items-center gap-2 rounded-lg border border-line p-2.5 ${exhausted ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-paper'}`}
                >
                  <input
                    type="checkbox"
                    checked={resendSelectedIds.includes(p.id)}
                    disabled={exhausted}
                    onChange={() => toggleResendSelection(p.id)}
                  />
                  <span>
                    <span className="block text-sm font-bold text-ink">{p.full_name || p.role_label}</span>
                    <span className="block text-xs text-slate">
                      {p.role_label} · {PARTY_STATUS_LABEL[p.status].label} ·{' '}
                      {exhausted ? 'استُنفدت محاولات الإرسال (3/3)' : `متبقٍ ${3 - p.reject_resend_count} من 3`}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => resendToParties(resendSelectedIds)} disabled={resendBusy || resendSelectedIds.length === 0}>
              {resendBusy ? 'جارِ الإرسال...' : `إرسال (${resendSelectedIds.length})`}
            </Button>
            <Button variant="secondary" onClick={() => setResendPickerOpen(false)} disabled={resendBusy}>
              إلغاء
            </Button>
          </div>
        </div>
      )}

      {canEditMeta && (
        <div className="rounded-xl border border-line bg-card p-5">
          <h2 className="mb-3 font-display text-sm font-bold text-ink">
            {isRejected || isExpired ? 'تعديل العقد قبل إعادة الإرسال' : 'تعديل العقد (مسودة)'}
          </h2>
          {isRejected && (
            <p className="mb-3 text-xs text-slate">
              رفض أحد الأطراف هذا العقد. يمكنك تعديل بياناته وبيانات الأطراف التي لم توقّع بعد أدناه، ثم الضغط على "إعادة إرسال الرابط" أعلى الصفحة.
            </p>
          )}
          {isExpired && (
            <p className="mb-3 text-xs text-slate">
              انتهت مدة صلاحية توثيق هذا العقد. يمكنك تعديل بياناته وبيانات الأطراف التي لم توقّع بعد أدناه، ثم الضغط على "إعادة إرسال الرابط" أعلى الصفحة.
            </p>
          )}
          <Link
            to={`/app/contracts/${contract.id}/edit`}
            className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-seal px-3 py-1.5 text-xs font-bold text-seal hover:bg-sealLight"
          >
            <Pencil size={13} /> تعديل محتوى {DOCUMENT_TYPE_LABELS[contract.document_type]} (النص/الحقول) عبر المعالج
          </Link>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="عنوان العقد" value={editTitle} onChange={setEditTitle} required />
            <Field label="صلاحية التوثيق (أيام)" value={editDuration} onChange={setEditDuration} type="number" min={1} max={14} placeholder="من 1 إلى 14" />
          </div>

          <div className="mt-4">
            {editTermMode === 'none' ? (
              <button type="button" onClick={() => setEditTermMode('duration')} className="text-sm font-bold text-seal">
                + تحديد مدة سريان العقد (اختياري)
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate">مدة سريان العقد</span>
                  <button type="button" onClick={() => setEditTermMode('none')} className="text-xs font-bold text-clay">
                    إزالة
                  </button>
                </div>
                <div className="flex gap-1.5 rounded-lg bg-paper p-1">
                  <button
                    type="button"
                    onClick={() => setEditTermMode('duration')}
                    className={`flex-1 rounded-md py-1.5 text-xs font-bold transition ${editTermMode === 'duration' ? 'bg-card text-ink shadow-sm' : 'text-slate'}`}
                  >
                    مدة
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTermMode('date')}
                    className={`flex-1 rounded-md py-1.5 text-xs font-bold transition ${editTermMode === 'date' ? 'bg-card text-ink shadow-sm' : 'text-slate'}`}
                  >
                    تاريخ محدد
                  </button>
                </div>
                {editTermMode === 'duration' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="القيمة" value={editTermValue} onChange={setEditTermValue} type="number" min={1} placeholder="مثال: 12" />
                    <label className="block text-sm">
                      <span className="mb-1 block font-bold text-ink">الوحدة</span>
                      <select
                        value={editTermUnit}
                        onChange={(e) => setEditTermUnit(e.target.value as TermUnit)}
                        className="w-full rounded-lg border border-line bg-card px-3 py-2 text-ink outline-none focus:border-seal"
                      >
                        {Object.entries(TERM_UNIT_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : (
                  <div>
                    <span className="mb-1 block text-sm font-bold text-ink">تاريخ انتهاء العقد</span>
                    <GregorianDateInput value={editTermEndDate} onChange={setEditTermEndDate} />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4">
            <Button variant="secondary" onClick={saveMeta} disabled={savingMeta}>
              {savingMeta ? 'جارِ الحفظ...' : 'حفظ التعديلات'}
            </Button>
          </div>
        </div>
      )}

      {!isDraft && (
        <div className="rounded-xl border border-line bg-card p-5">
          <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate">
            <span>نسبة الإنجاز</span>
            <span>
              {signedCount} / {parties.length}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-paper">
            <div className="h-full rounded-full bg-sage transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {previewHtml && (
        <div className="rounded-xl border border-line bg-card p-5">
          <h2 className="mb-3 font-display text-sm font-bold text-ink">معاينة محتوى العقد</h2>
          {/* بيضاء دائمًا (كسابقتها في المحرر): محتوى رسمي نصّه أسود ثابت عبر .prose. */}
          <div className="prose max-w-none rounded-lg bg-white p-4 text-sm text-ink" dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      )}

      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="mb-3 font-display text-sm font-bold text-ink">الأطراف {!isDraft && 'وسجل التوقيعات'}</h2>
        <div className="space-y-3">
          {parties.map((p) =>
            isDraft || ((isRejected || isExpired) && p.status !== 'signed') ? (
              <div key={p.id} className="rounded-lg border border-line p-3">
                <div className="mb-2 flex items-center justify-between">
                  <select
                    value={p.role_label}
                    onChange={(e) => patchParty(p.id, { role_label: e.target.value })}
                    className="rounded-lg border border-line bg-card px-2 py-1 text-xs text-ink outline-none focus:border-seal"
                  >
                    {PARTY_ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  {isDraft && (
                    <button type="button" onClick={() => removeDraftParty(p.id)} className="text-clay">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Field label="الاسم" value={p.full_name ?? ''} onChange={(v) => patchParty(p.id, { full_name: v })} />
                  <Field
                    label="رقم الهوية"
                    value={p.national_id ?? ''}
                    onChange={(v) => patchParty(p.id, { national_id: v })}
                    digitsOnly
                    maxLength={10}
                    hint="10 أرقام فقط"
                  />
                  <Field label="البريد الإلكتروني" value={p.email ?? ''} onChange={(v) => patchParty(p.id, { email: v })} type="email" />
                  <Field label="الجوال" value={p.phone ?? ''} onChange={(v) => patchParty(p.id, { phone: v })} phone />
                </div>
              </div>
            ) : (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-bold text-ink">{p.full_name || 'بانتظار التحقق عبر نفاذ'}</p>
                    <StatusPill
                      label={PARTY_STATUS_LABEL[p.status].label}
                      bg={PARTY_STATUS_LABEL[p.status].bg}
                      fg={PARTY_STATUS_LABEL[p.status].fg}
                    />
                  </div>
                  <p className="text-xs text-slate">
                    {p.role_label}
                    {p.verification_method === 'nafath' && p.nafath_verified_at && ' · وُثّق عبر نفاذ'}
                    {p.signed_at && ` في ${formatDateTime(p.signed_at)}`}
                  </p>
                  {p.status === 'signed' && (p.signed_ip || p.signed_user_agent) && (
                    <p className="mt-0.5 text-[11px] text-slate/70">
                      أثر التوقيع: {p.signed_ip || '—'} · {parseUserAgent(p.signed_user_agent)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {p.status !== 'signed' && (
                    <button
                      type="button"
                      onClick={() => copyLink(p.token)}
                      className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs font-bold text-ink hover:bg-paper"
                    >
                      <Copy size={12} /> نسخ رابط التوقيع
                    </button>
                  )}
                </div>
              </div>
            ),
          )}
        </div>
        {isDraft && (
          <div className="mt-3">
            <Button variant="secondary" onClick={addDraftParty}>
              <span className="flex items-center gap-1.5">
                <Plus size={16} /> إضافة طرف
              </span>
            </Button>
          </div>
        )}
      </div>

      {isDraft && (
        <div className="rounded-xl border border-line bg-card p-5">
          <p className="mb-3 text-xs text-slate">
            يمكنك تعديل عنوان العقد ومدة توثيقه وبيانات الأطراف من هنا. تعديل محتوى العقد نفسه (النص أو مواضع الحقول) متاح فقط أثناء إنشائه في المعالج.
          </p>
          <Button onClick={send} disabled={sending}>
            {sending ? 'جارِ الإرسال...' : 'إرسال للتوثيق'}
          </Button>
        </div>
      )}

      {error && contract && <p className="text-sm font-bold text-clay">{error}</p>}

      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="mb-3 font-display text-sm font-bold text-ink">سجل الأحداث</h2>
        <ul className="space-y-2 text-sm">
          {events.map((e) => {
            const meta = EVENT_TYPE_META[e.event_type] ?? DEFAULT_EVENT_META;
            const Icon = meta.icon;
            return (
              <li key={e.id} className="flex items-start justify-between gap-3 border-b border-line pb-2 last:border-0">
                <span className={`flex items-start gap-2 ${meta.className}`}>
                  <Icon size={15} className="mt-0.5 shrink-0" />
                  <span className="text-ink">{e.message ?? e.event_type}</span>
                </span>
                <span className="shrink-0 text-xs text-slate">{formatDateTime(e.created_at)}</span>
              </li>
            );
          })}
          {events.length === 0 && <li className="text-xs text-slate">لا توجد أحداث بعد</li>}
        </ul>
      </div>
    </div>
  );
}
