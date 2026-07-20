import { useEffect, useState } from 'react';
import { Plus, Trash2, Check, X } from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { Button } from '@/shared/ui/Button';
import { useSession } from '@/features/auth/hooks/useSession';
import { hasAdminPermission } from '@/features/auth/types';
import {
  createCreditCode,
  deleteCreditCode,
  listCreditCodes,
  reviewCreditCode,
  toggleCreditCode,
  type CreditCode,
} from '../api/creditCodesApi';

const emptyForm = { code: '', amount: '100', max_uses: '' };

const APPROVAL_BADGE: Record<CreditCode['approval_status'], { label: string; className: string }> = {
  approved: { label: 'معتمد', className: 'bg-sageLight text-sage' },
  pending: { label: 'بانتظار موافقة الأدمن', className: 'bg-clayLight text-clay' },
  rejected: { label: 'مرفوض', className: 'bg-line text-slate' },
};

export function CreditCodesPage() {
  const { profile } = useSession();
  const isAdmin = profile?.role === 'admin';
  const canCreate = hasAdminPermission(profile, 'create_credit_codes');
  const needsApproval = canCreate && !hasAdminPermission(profile, 'create_credit_codes_direct');

  const [codes, setCodes] = useState<CreditCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<'codes' | 'requests'>('codes');

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
      await createCreditCode(
        {
          code: form.code.trim().toUpperCase(),
          amount: Number(form.amount),
          max_uses: form.max_uses ? Number(form.max_uses) : null,
        },
        needsApproval,
      );
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

  const review = async (id: string, approve: boolean) => {
    await reviewCreditCode(id, approve);
    await load();
  };

  const pendingCodes = codes.filter((c) => c.approval_status === 'pending');
  const visibleCodes = tab === 'requests' ? pendingCodes : codes;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">أكواد الشحن (الرصيد)</h1>
          <p className="mt-1 text-sm text-slate">كل كود يشحن رصيد المستخدم الذي يستخدمه، ويُخصم من رصيده تلقائيًا عند إرسال أي عقد للتوثيق.</p>
        </div>
        {isAdmin && (
          <div className="flex gap-1.5 rounded-lg bg-paper p-1">
            <button
              type="button"
              onClick={() => setTab('codes')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${tab === 'codes' ? 'bg-card text-ink shadow-sm' : 'text-slate'}`}
            >
              الأكواد
            </button>
            <button
              type="button"
              onClick={() => setTab('requests')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${tab === 'requests' ? 'bg-card text-ink shadow-sm' : 'text-slate'}`}
            >
              طلبات الموافقة {pendingCodes.length > 0 && `(${pendingCodes.length})`}
            </button>
          </div>
        )}
      </div>

      {canCreate && tab === 'codes' && (
        <form
          className="rounded-xl border border-line bg-card p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!creating) create();
          }}
        >
          <h2 className="mb-4 font-display text-sm font-bold text-ink">إنشاء كود شحن جديد</h2>
          {needsApproval && (
            <p className="mb-3 rounded-lg bg-clayLight p-3 text-xs font-bold text-clay">
              لا تملك صلاحية الإنشاء المباشر — سيُرسَل الكود لموافقة الأدمن الرئيسي قبل تفعيله.
            </p>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="الكود" value={form.code} onChange={(v) => setForm((f) => ({ ...f, code: v }))} required />
            <Field label="قيمة الشحن (ريال)" value={form.amount} onChange={(v) => setForm((f) => ({ ...f, amount: v }))} type="number" required />
            <Field label="الحد الأقصى للاستخدام (اختياري)" value={form.max_uses} onChange={(v) => setForm((f) => ({ ...f, max_uses: v }))} type="number" />
          </div>
          {error && <p className="mt-3 text-sm font-bold text-clay">{error}</p>}
          <div className="mt-4">
            <Button type="submit" disabled={creating}>
              <span className="flex items-center gap-1.5">
                <Plus size={16} /> {creating ? 'جارِ الإنشاء...' : needsApproval ? 'إرسال للموافقة' : 'إنشاء الكود'}
              </span>
            </Button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="mb-4 font-display text-sm font-bold text-ink">{tab === 'requests' ? 'الطلبات بانتظار الموافقة' : 'الأكواد الحالية'}</h2>
        {loading && <p className="text-sm text-slate">جارِ التحميل...</p>}
        <div className="space-y-2">
          {visibleCodes.map((c) => {
            const badge = APPROVAL_BADGE[c.approval_status];
            return (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm font-bold text-ink" dir="ltr">
                      {c.code}
                    </p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${badge.className}`}>{badge.label}</span>
                  </div>
                  <p className="text-xs text-slate">
                    {c.amount.toFixed(2)} ريال · استُخدم {c.uses_count} مرة
                    {c.max_uses !== null && ` من ${c.max_uses}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {c.approval_status === 'pending' && isAdmin ? (
                    <>
                      <button
                        type="button"
                        onClick={() => review(c.id, true)}
                        className="flex items-center gap-1 rounded-lg bg-sageLight px-2.5 py-1 text-xs font-bold text-sage"
                      >
                        <Check size={13} /> موافقة
                      </button>
                      <button
                        type="button"
                        onClick={() => review(c.id, false)}
                        className="flex items-center gap-1 rounded-lg bg-clayLight px-2.5 py-1 text-xs font-bold text-clay"
                      >
                        <X size={13} /> رفض
                      </button>
                    </>
                  ) : (
                    isAdmin && (
                      <button
                        type="button"
                        onClick={() => toggle(c)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold ${c.is_active ? 'bg-sageLight text-sage' : 'bg-line text-slate'}`}
                      >
                        {c.is_active ? 'مُفعَّل' : 'مُعطَّل'}
                      </button>
                    )
                  )}
                  {isAdmin && (
                    <button type="button" onClick={() => remove(c.id)} className="text-clay">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {!loading && visibleCodes.length === 0 && (
            <p className="text-sm text-slate">{tab === 'requests' ? 'لا توجد طلبات بانتظار الموافقة' : 'لا توجد أكواد شحن بعد'}</p>
          )}
        </div>
      </div>
    </div>
  );
}
