import { useEffect, useState } from 'react';
import { Field } from '@/shared/ui/Field';
import { Button } from '@/shared/ui/Button';
import { fetchPricingSettings, updatePricingSettings, calculateInvoice, type PricingSettings } from '../api/pricingApi';

export function PricingSettingsPage() {
  const [pricing, setPricing] = useState<PricingSettings | null>(null);
  const [form, setForm] = useState({ base_amount: '', extra_party_fee: '', minimum_invoice: '', tax_percent: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchPricingSettings()
      .then((p) => {
        setPricing(p);
        setForm({
          base_amount: String(p.base_amount),
          extra_party_fee: String(p.extra_party_fee),
          minimum_invoice: String(p.minimum_invoice),
          tax_percent: String(p.tax_percent),
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'تعذّر تحميل إعدادات التسعير'))
      .finally(() => setLoading(false));
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
      const updated = await updatePricingSettings(patch);
      setPricing(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر حفظ إعدادات التسعير');
    } finally {
      setSaving(false);
    }
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

  if (loading) return <p className="text-sm text-slate">جارِ التحميل...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">إعدادات التسعير</h1>
        <p className="mt-1 text-sm text-slate">القيمة الأساسية تغطي أول طرفين في العقد، ويُضاف رسم لكل طرف زائد عنهما، ثم الضريبة إن وُجدت.</p>
      </div>

      <div className="rounded-xl border border-line bg-card p-5">
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
        {saved && <p className="mt-3 text-sm font-bold text-sage">تم الحفظ بنجاح</p>}
        <div className="mt-4">
          <Button onClick={save} disabled={saving}>
            {saving ? 'جارِ الحفظ...' : 'حفظ الإعدادات'}
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
    </div>
  );
}
