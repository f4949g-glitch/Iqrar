import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { Button } from '@/shared/ui/Button';
import {
  createDiscountCode,
  deleteDiscountCode,
  listDiscountCodes,
  toggleDiscountCode,
  type DiscountCode,
} from '../api/discountCodesApi';

const emptyForm = { code: '', discount_percent: '10', max_uses: '', max_uses_per_user: '', starts_at: '', ends_at: '' };

export function DiscountCodesPage() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setCodes(await listDiscountCodes());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تحميل أكواد الخصم');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    setError('');
    if (!form.code.trim() || !form.discount_percent) {
      setError('الكود ونسبة الخصم مطلوبان');
      return;
    }
    setCreating(true);
    try {
      await createDiscountCode({
        code: form.code.trim().toUpperCase(),
        discount_percent: Number(form.discount_percent),
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        max_uses_per_user: form.max_uses_per_user ? Number(form.max_uses_per_user) : null,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
      });
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر إنشاء الكود');
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (code: DiscountCode) => {
    await toggleDiscountCode(code.id, !code.is_active);
    await load();
  };

  const remove = async (id: string) => {
    await deleteDiscountCode(id);
    await load();
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-ink">أكواد الخصم</h1>

      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="mb-4 font-display text-sm font-bold text-ink">إنشاء كود جديد</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="الكود" value={form.code} onChange={(v) => setForm((f) => ({ ...f, code: v }))} required />
          <Field label="نسبة الخصم %" value={form.discount_percent} onChange={(v) => setForm((f) => ({ ...f, discount_percent: v }))} type="number" required />
          <Field label="الحد الأقصى للاستخدام (اختياري)" value={form.max_uses} onChange={(v) => setForm((f) => ({ ...f, max_uses: v }))} type="number" />
          <Field
            label="الحد الأقصى لكل مستخدم (اختياري)"
            value={form.max_uses_per_user}
            onChange={(v) => setForm((f) => ({ ...f, max_uses_per_user: v }))}
            type="number"
          />
          <Field label="تاريخ البداية (اختياري)" value={form.starts_at} onChange={(v) => setForm((f) => ({ ...f, starts_at: v }))} type="date" />
          <Field label="تاريخ الانتهاء (اختياري)" value={form.ends_at} onChange={(v) => setForm((f) => ({ ...f, ends_at: v }))} type="date" />
        </div>
        {error && <p className="mt-3 text-sm font-bold text-clay">{error}</p>}
        <div className="mt-4">
          <Button onClick={create} disabled={creating}>
            <span className="flex items-center gap-1.5">
              <Plus size={16} /> {creating ? 'جارِ الإنشاء...' : 'إنشاء الكود'}
            </span>
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="mb-4 font-display text-sm font-bold text-ink">الأكواد الحالية</h2>
        {loading && <p className="text-sm text-slate">جارِ التحميل...</p>}
        <div className="space-y-2">
          {codes.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3">
              <div>
                <p className="font-mono text-sm font-bold text-ink" dir="ltr">
                  {c.code}
                </p>
                <p className="text-xs text-slate">
                  خصم {c.discount_percent}%
                  {c.max_uses !== null && ` · حد أقصى ${c.max_uses} استخدام`}
                  {c.max_uses_per_user !== null && ` · ${c.max_uses_per_user} لكل مستخدم`}
                  {c.ends_at && ` · حتى ${new Date(c.ends_at).toLocaleDateString('ar-SA')}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggle(c)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold ${c.is_active ? 'bg-sageLight text-sage' : 'bg-line text-slate'}`}
                >
                  {c.is_active ? 'مُفعَّل' : 'مُعطَّل'}
                </button>
                <button type="button" onClick={() => remove(c.id)} className="text-clay">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {!loading && codes.length === 0 && <p className="text-sm text-slate">لا توجد أكواد خصم بعد</p>}
        </div>
      </div>
    </div>
  );
}
