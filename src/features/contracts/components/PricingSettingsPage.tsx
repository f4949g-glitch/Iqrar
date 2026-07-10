import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { Button } from '@/shared/ui/Button';
import { useSession } from '@/features/auth/hooks/useSession';
import { hasAdminPermission } from '@/features/auth/types';
import { formatDate } from '@/shared/lib/formatDate';
import {
  fetchPricingSettings,
  updatePricingSettings,
  calculateInvoice,
  requestPricingChange,
  listPricingChangeRequests,
  reviewPricingChangeRequest,
  type PricingSettings,
  type PricingChangeRequest,
} from '../api/pricingApi';

const STATUS_BADGE: Record<PricingChangeRequest['status'], { label: string; className: string }> = {
  pending: { label: 'بانتظار موافقة الأدمن', className: 'bg-clayLight text-clay' },
  approved: { label: 'معتمد', className: 'bg-sageLight text-sage' },
  rejected: { label: 'مرفوض', className: 'bg-line text-slate' },
};

export function PricingSettingsPage() {
  const { profile } = useSession();
  const isAdmin = profile?.role === 'admin';
  const canEditDirect = hasAdminPermission(profile, 'manage_pricing_direct');
  const canRequest = hasAdminPermission(profile, 'manage_pricing') && !canEditDirect;

  const [pricing, setPricing] = useState<PricingSettings | null>(null);
  const [form, setForm] = useState({ base_amount: '', extra_party_fee: '', minimum_invoice: '', tax_percent: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<'settings' | 'requests'>('settings');
  const [requests, setRequests] = useState<PricingChangeRequest[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const p = await fetchPricingSettings();
      setPricing(p);
      setForm({
        base_amount: String(p.base_amount),
        extra_party_fee: String(p.extra_party_fee),
        minimum_invoice: String(p.minimum_invoice),
        tax_percent: String(p.tax_percent),
      });
      if (isAdmin || canRequest) setRequests(await listPricingChangeRequests());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تحميل إعدادات التسعير');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const patch = {
        base_amount: Number(form.base_amount),
        extra_party_fee: Number(form.extra_party_fee),
        minimum_invoice: Number(form.minimum_invoice),
        tax_percent: Number(form.tax_percent),
      };
      if (canRequest) {
        await requestPricingChange(patch);
        setRequests(await listPricingChangeRequests());
      } else {
        const updated = await updatePricingSettings(patch);
        setPricing(updated);
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر حفظ إعدادات التسعير');
    } finally {
      setSaving(false);
    }
  };

  const review = async (id: string, approve: boolean) => {
    await reviewPricingChangeRequest(id, approve);
    await load();
  };

  const preview = pricing
    ? [2, 3, 5].map((n) => ({
        n,
        amount: calculateInvoice(n, {
          base_amount: Number(form.base_amount) || 0,
          extra_party_fee: Number(form.extra_party_fee) || 0,
          minimum_invoice: Number(form.minimum_invoice) || 0,
          tax_percent: Number(form.tax_percent) || 0,
        }),
      }))
    : [];

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  if (loading) return <p className="text-sm text-slate">جارِ التحميل...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">إعدادات التسعير</h1>
          <p className="mt-1 text-sm text-slate">القيمة الأساسية تغطي أول طرفين في العقد، ويُضاف رسم لكل طرف زائد عنهما، ثم الضريبة إن وُجدت.</p>
        </div>
        {(isAdmin || canRequest) && (
          <div className="flex gap-1.5 rounded-lg bg-paper p-1">
            <button
              type="button"
              onClick={() => setTab('settings')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${tab === 'settings' ? 'bg-card text-ink shadow-sm' : 'text-slate'}`}
            >
              الإعدادات
            </button>
            <button
              type="button"
              onClick={() => setTab('requests')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${tab === 'requests' ? 'bg-card text-ink shadow-sm' : 'text-slate'}`}
            >
              {isAdmin ? 'طلبات الموافقة' : 'طلباتي'} {pendingRequests.length > 0 && `(${pendingRequests.length})`}
            </button>
          </div>
        )}
      </div>

      {tab === 'settings' ? (
        <>
          <div className="rounded-xl border border-line bg-card p-5">
            {canRequest && (
              <p className="mb-3 rounded-lg bg-clayLight p-3 text-xs font-bold text-clay">
                لا تملك صلاحية التعديل المباشر — سيُرسَل التغيير لموافقة الأدمن الرئيسي قبل تطبيقه.
              </p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                label="القيمة الأساسية (أول طرفين، ريال)"
                value={form.base_amount}
                onChange={(v) => setForm((f) => ({ ...f, base_amount: v }))}
                type="number"
              />
              <Field
                label="رسم كل طرف إضافي (ريال)"
                value={form.extra_party_fee}
                onChange={(v) => setForm((f) => ({ ...f, extra_party_fee: v }))}
                type="number"
              />
              <Field
                label="الحد الأدنى للفاتورة (ريال)"
                value={form.minimum_invoice}
                onChange={(v) => setForm((f) => ({ ...f, minimum_invoice: v }))}
                type="number"
              />
              <Field label="نسبة الضريبة % (اختياري)" value={form.tax_percent} onChange={(v) => setForm((f) => ({ ...f, tax_percent: v }))} type="number" />
            </div>
            {error && <p className="mt-3 text-sm font-bold text-clay">{error}</p>}
            {saved && <p className="mt-3 text-sm font-bold text-sage">{canRequest ? 'تم إرسال الطلب لموافقة الأدمن الرئيسي' : 'تم الحفظ بنجاح'}</p>}
            <div className="mt-4">
              <Button onClick={save} disabled={saving}>
                {saving ? 'جارِ الحفظ...' : canRequest ? 'إرسال للموافقة' : 'حفظ الإعدادات'}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-card p-5">
            <h2 className="mb-3 font-display text-sm font-bold text-ink">معاينة التكلفة</h2>
            <ul className="space-y-1.5 text-sm text-slate">
              {preview.map((p) => (
                <li key={p.n}>
                  {p.n} أطراف: <span className="font-bold text-ink">{p.amount.toFixed(2)} ريال</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-line bg-card p-5">
          <h2 className="mb-4 font-display text-sm font-bold text-ink">{isAdmin ? 'طلبات تغيير التسعير' : 'طلباتي'}</h2>
          <div className="space-y-2">
            {(isAdmin ? requests : pendingRequests).map((r) => {
              const badge = STATUS_BADGE[r.status];
              return (
                <div key={r.id} className="rounded-lg border border-line p-3">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${badge.className}`}>{badge.label}</span>
                    <span className="text-xs text-slate">{formatDate(r.created_at)}</span>
                  </div>
                  <p className="text-xs text-ink">
                    أساسي: {r.base_amount} · طرف إضافي: {r.extra_party_fee} · حد أدنى: {r.minimum_invoice} · ضريبة: {r.tax_percent}%
                  </p>
                  {r.status === 'pending' && isAdmin && (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => review(r.id, true)}
                        className="flex items-center gap-1 rounded-lg bg-sageLight px-2.5 py-1 text-xs font-bold text-sage"
                      >
                        <Check size={13} /> موافقة
                      </button>
                      <button
                        type="button"
                        onClick={() => review(r.id, false)}
                        className="flex items-center gap-1 rounded-lg bg-clayLight px-2.5 py-1 text-xs font-bold text-clay"
                      >
                        <X size={13} /> رفض
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {(isAdmin ? requests : pendingRequests).length === 0 && <p className="text-sm text-slate">لا توجد طلبات</p>}
          </div>
        </div>
      )}
    </div>
  );
}
