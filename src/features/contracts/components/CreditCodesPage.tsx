import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { Button } from '@/shared/ui/Button';
import { createCreditCode, deleteCreditCode, listCreditCodes, toggleCreditCode, type CreditCode } from '../api/creditCodesApi';

const emptyForm = { code: '', amount: '100', max_uses: '' };

export function CreditCodesPage() {
  const [codes, setCodes] = useState<CreditCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setCodes(await listCreditCodes());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تحميل أكواد الشحن');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    setError('');
    if (!form.code.trim() || !form.amount) {
      setError('الكود والمبلغ مطلوبان');
      return;
    }
    setCreating(true);
    try {
      await createCreditCode({
        code: form.code.trim().toUpperCase(),
        amount: Number(form.amount),
        max_uses: form.max_uses ? Number(form.max_uses) : null,
      });
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر إنشاء الكود');
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (c: CreditCode) => {
    await toggleCreditCode(c.id, !c.is_active);
    await load();
  };

  const remove = async (id: string) => {
    await deleteCreditCode(id);
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">أكواد الشحن (الرصيد)</h1>
        <p className="mt-1 text-sm text-slate">كل كود يشحن رصيد المستخدم الذي يستخدمه، ويُخصم من رصيده تلقائيًا عند إرسال أي عقد للتوثيق.</p>
      </div>

      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="mb-4 font-display text-sm font-bold text-ink">إنشاء كود شحن جديد</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="الكود" value={form.code} onChange={(v) => setForm((f) => ({ ...f, code: v }))} required />
          <Field label="قيمة الشحن (ريال)" value={form.amount} onChange={(v) => setForm((f) => ({ ...f, amount: v }))} type="number" required />
          <Field label="الحد الأقصى للاستخدام (اختياري)" value={form.max_uses} onChange={(v) => setForm((f) => ({ ...f, max_uses: v }))} type="number" />
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
                  {c.amount.toFixed(2)} ريال · استُخدم {c.uses_count} مرة
                  {c.max_uses !== null && ` من ${c.max_uses}`}
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
          {!loading && codes.length === 0 && <p className="text-sm text-slate">لا توجد أكواد شحن بعد</p>}
        </div>
      </div>
    </div>
  );
}
