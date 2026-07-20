import { useEffect, useState } from 'react';
import { Plus, Trash2, Check, X, Pencil, Power, PowerOff } from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { Button } from '@/shared/ui/Button';
import { useSession } from '@/features/auth/hooks/useSession';
import { hasAdminPermission } from '@/features/auth/types';
import {
  createDiscountCode,
  deleteDiscountCode,
  listDiscountCodes,
  reviewDiscountCode,
  toggleDiscountCode,
  updateDiscountCode,
  type DiscountCode,
} from '../api/discountCodesApi';
import { formatDate } from '@/shared/lib/formatDate';

const emptyForm = { code: '', discount_percent: '10', max_uses: '', max_uses_per_user: '', starts_at: '', ends_at: '' };

type EditForm = { discount_percent: string; max_uses: string; max_uses_per_user: string; starts_at: string; ends_at: string };

const codeToEditForm = (c: DiscountCode): EditForm => ({
  discount_percent: String(c.discount_percent),
  max_uses: c.max_uses !== null ? String(c.max_uses) : '',
  max_uses_per_user: c.max_uses_per_user !== null ? String(c.max_uses_per_user) : '',
  // starts_at/ends_at مخزَّنة كـ timestamptz كاملة (مثال "2026-08-01T00:00:00+00:00")؛
  // GregorianDateInput يتوقّع صيغة YYYY-MM-DD فقط.
  starts_at: c.starts_at ? c.starts_at.slice(0, 10) : '',
  ends_at: c.ends_at ? c.ends_at.slice(0, 10) : '',
});

const APPROVAL_BADGE: Record<DiscountCode['approval_status'], { label: string; className: string }> = {
  approved: { label: 'معتمد', className: 'bg-sageLight text-sage' },
  pending: { label: 'بانتظار موافقة الأدمن', className: 'bg-clayLight text-clay' },
  rejected: { label: 'مرفوض', className: 'bg-line text-slate' },
};

export function DiscountCodesPage() {
  const { profile } = useSession();
  const isAdmin = profile?.role === 'admin';
  const canCreate = hasAdminPermission(profile, 'create_discount_codes');
  const needsApproval = canCreate && !hasAdminPermission(profile, 'create_discount_codes_direct');

  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<'codes' | 'requests'>('codes');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ discount_percent: '', max_uses: '', max_uses_per_user: '', starts_at: '', ends_at: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

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
      await createDiscountCode(
        {
          code: form.code.trim().toUpperCase(),
          discount_percent: Number(form.discount_percent),
          max_uses: form.max_uses ? Number(form.max_uses) : null,
          max_uses_per_user: form.max_uses_per_user ? Number(form.max_uses_per_user) : null,
          starts_at: form.starts_at || null,
          ends_at: form.ends_at || null,
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

  const toggle = async (code: DiscountCode) => {
    await toggleDiscountCode(code.id, !code.is_active);
    await load();
  };

  const startEdit = (code: DiscountCode) => {
    setEditingId(code.id);
    setEditForm(codeToEditForm(code));
    setEditError('');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setEditError('');
    if (!editForm.discount_percent) {
      setEditError('نسبة الخصم مطلوبة');
      return;
    }
    setSavingEdit(true);
    try {
      await updateDiscountCode(editingId, {
        discount_percent: Number(editForm.discount_percent),
        max_uses: editForm.max_uses ? Number(editForm.max_uses) : null,
        max_uses_per_user: editForm.max_uses_per_user ? Number(editForm.max_uses_per_user) : null,
        starts_at: editForm.starts_at || null,
        ends_at: editForm.ends_at || null,
      });
      setEditingId(null);
      await load();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'تعذّر حفظ التعديلات');
    } finally {
      setSavingEdit(false);
    }
  };

  const remove = async (id: string) => {
    await deleteDiscountCode(id);
    await load();
  };

  const review = async (id: string, approve: boolean) => {
    await reviewDiscountCode(id, approve);
    await load();
  };

  const pendingCodes = codes.filter((c) => c.approval_status === 'pending');
  const visibleCodes = tab === 'requests' ? pendingCodes : codes;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-ink">أكواد الخصم</h1>
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
          <h2 className="mb-4 font-display text-sm font-bold text-ink">إنشاء كود جديد</h2>
          {needsApproval && (
            <p className="mb-3 rounded-lg bg-clayLight p-3 text-xs font-bold text-clay">
              لا تملك صلاحية الإنشاء المباشر — سيُرسَل الكود لموافقة الأدمن الرئيسي قبل تفعيله.
            </p>
          )}
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
            const isEditing = editingId === c.id;
            return (
              <div key={c.id} className="rounded-lg border border-line p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm font-bold text-ink" dir="ltr">
                        {c.code}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${badge.className}`}>{badge.label}</span>
                    </div>
                    <p className="text-xs text-slate">
                      خصم {c.discount_percent}%
                      {c.max_uses !== null && ` · حد أقصى ${c.max_uses} استخدام`}
                      {c.max_uses_per_user !== null && ` · ${c.max_uses_per_user} لكل مستخدم`}
                      {c.ends_at && ` · حتى ${formatDate(c.ends_at)}`}
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
                          title={c.is_active ? 'تعطيل الكود' : 'تفعيل الكود'}
                          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold ${c.is_active ? 'bg-sageLight text-sage' : 'bg-line text-slate'}`}
                        >
                          {c.is_active ? <Power size={13} /> : <PowerOff size={13} />}
                          {c.is_active ? 'مُفعَّل' : 'مُعطَّل'}
                        </button>
                      )
                    )}
                    {isAdmin && c.approval_status !== 'pending' && (
                      <button
                        type="button"
                        onClick={() => (isEditing ? setEditingId(null) : startEdit(c))}
                        title="تعديل الكود (النسبة، حدود الاستخدام، تمديد الصلاحية)"
                        className="text-seal"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                    {isAdmin && (
                      <button type="button" onClick={() => remove(c.id)} title="حذف الكود" className="text-clay">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <form
                    className="mt-3 rounded-lg border border-dashed border-seal bg-sealLight/30 p-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!savingEdit) saveEdit();
                    }}
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <Field
                        label="نسبة الخصم %"
                        value={editForm.discount_percent}
                        onChange={(v) => setEditForm((f) => ({ ...f, discount_percent: v }))}
                        type="number"
                        required
                      />
                      <Field
                        label="الحد الأقصى للاستخدام (اختياري)"
                        value={editForm.max_uses}
                        onChange={(v) => setEditForm((f) => ({ ...f, max_uses: v }))}
                        type="number"
                      />
                      <Field
                        label="الحد الأقصى لكل مستخدم (اختياري)"
                        value={editForm.max_uses_per_user}
                        onChange={(v) => setEditForm((f) => ({ ...f, max_uses_per_user: v }))}
                        type="number"
                      />
                      <Field
                        label="تاريخ البداية (اختياري)"
                        value={editForm.starts_at}
                        onChange={(v) => setEditForm((f) => ({ ...f, starts_at: v }))}
                        type="date"
                      />
                      <Field
                        label="تاريخ الانتهاء / التمديد (اختياري)"
                        value={editForm.ends_at}
                        onChange={(v) => setEditForm((f) => ({ ...f, ends_at: v }))}
                        type="date"
                      />
                    </div>
                    {editError && <p className="mt-2 text-xs font-bold text-clay">{editError}</p>}
                    <div className="mt-3 flex items-center gap-2">
                      <Button type="submit" disabled={savingEdit}>
                        {savingEdit ? 'جارِ الحفظ...' : 'حفظ التعديلات'}
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => setEditingId(null)} disabled={savingEdit}>
                        إلغاء
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
          {!loading && visibleCodes.length === 0 && (
            <p className="text-sm text-slate">{tab === 'requests' ? 'لا توجد طلبات بانتظار الموافقة' : 'لا توجد أكواد خصم بعد'}</p>
          )}
        </div>
      </div>
    </div>
  );
}
