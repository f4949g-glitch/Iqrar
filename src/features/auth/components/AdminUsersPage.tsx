import { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { Button } from '@/shared/ui/Button';
import { formatDate } from '@/shared/lib/formatDate';
import { createSubAdmin, listAdminUsers, updateSubAdminPermissions } from '../api/adminUsersApi';
import { ADMIN_PERMISSION_LABELS, type AdminPermission, type Profile } from '../types';

const ALL_PERMISSIONS = Object.keys(ADMIN_PERMISSION_LABELS) as AdminPermission[];
const ROLE_LABEL: Record<string, string> = { admin: 'مدير المنصة', sub_admin: 'أدمن فرعي' };

const emptyForm = { full_name: '', national_id: '', email: '', phone: '', permissions: [] as AdminPermission[] };

function PermissionsEditor({ value, onChange }: { value: AdminPermission[]; onChange: (v: AdminPermission[]) => void }) {
  const toggle = (perm: AdminPermission) => {
    onChange(value.includes(perm) ? value.filter((p) => p !== perm) : [...value, perm]);
  };
  return (
    <div className="space-y-1.5">
      {ALL_PERMISSIONS.map((perm) => (
        <label key={perm} className="flex items-center gap-2 text-xs font-bold text-ink">
          <input type="checkbox" checked={value.includes(perm)} onChange={() => toggle(perm)} />
          {ADMIN_PERMISSION_LABELS[perm]}
        </label>
      ))}
    </div>
  );
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ national_id: string; temp_password: string } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setUsers(await listAdminUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تحميل المستخدمين الإداريين');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    setError('');
    setCreatedCreds(null);
    if (!form.full_name.trim() || !form.national_id.trim() || !form.email.trim()) {
      setError('الاسم ورقم الهوية والبريد الإلكتروني مطلوبة');
      return;
    }
    setCreating(true);
    try {
      const result = await createSubAdmin({
        full_name: form.full_name.trim(),
        national_id: form.national_id.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        permissions: form.permissions,
      });
      setCreatedCreds(result);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر إنشاء الحساب');
    } finally {
      setCreating(false);
    }
  };

  const savePermissions = async (id: string, permissions: AdminPermission[]) => {
    setSavingId(id);
    try {
      await updateSubAdminPermissions(id, permissions);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, admin_permissions: permissions } : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر حفظ الصلاحيات');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">مستخدمو الإدارة</h1>
        <p className="mt-1 text-sm text-slate">أنشئ حسابات أدمن فرعي وحدّد صلاحياتها بدقة (اطلاع على التقارير، إنشاء أكواد خصم بموافقة أو مباشرة).</p>
      </div>

      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="mb-4 font-display text-sm font-bold text-ink">إنشاء أدمن فرعي جديد</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="الاسم" value={form.full_name} onChange={(v) => setForm((f) => ({ ...f, full_name: v }))} required />
          <Field label="رقم الهوية" value={form.national_id} onChange={(v) => setForm((f) => ({ ...f, national_id: v }))} digitsOnly maxLength={10} required hint="10 أرقام فقط" />
          <Field label="البريد الإلكتروني" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} type="email" required />
          <Field label="رقم الجوال (اختياري)" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} phone />
        </div>
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold text-slate">الصلاحيات</p>
          <PermissionsEditor value={form.permissions} onChange={(v) => setForm((f) => ({ ...f, permissions: v }))} />
        </div>
        {error && <p className="mt-3 text-sm font-bold text-clay">{error}</p>}
        {createdCreds && (
          <div className="mt-3 rounded-lg bg-sealLight p-3 text-xs font-bold text-seal">
            تم إنشاء الحساب — رقم الهوية للدخول: <span dir="ltr">{createdCreds.national_id}</span>، كلمة المرور المؤقتة:{' '}
            <span dir="ltr">{createdCreds.temp_password}</span> (سيُطلب من المستخدم تغييرها عند أول دخول).
          </div>
        )}
        <div className="mt-4">
          <Button onClick={create} disabled={creating}>
            <span className="flex items-center gap-1.5">
              <UserPlus size={16} /> {creating ? 'جارِ الإنشاء...' : 'إنشاء الحساب'}
            </span>
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="mb-4 font-display text-sm font-bold text-ink">مستخدمو الإدارة الحاليون</h2>
        {loading && <p className="text-sm text-slate">جارِ التحميل...</p>}
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="rounded-lg border border-line p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-ink">{u.full_name || u.email}</p>
                  <p className="text-xs text-slate">
                    {ROLE_LABEL[u.role] ?? u.role} · {u.national_id || '—'} · منذ {formatDate(u.created_at)}
                  </p>
                </div>
              </div>
              {u.role === 'sub_admin' && (
                <div className="border-t border-line pt-2">
                  <PermissionsEditor value={u.admin_permissions} onChange={(v) => savePermissions(u.id, v)} />
                  {savingId === u.id && <p className="mt-1 text-xs text-slate">جارِ الحفظ...</p>}
                </div>
              )}
            </div>
          ))}
          {!loading && users.length === 0 && <p className="text-sm text-slate">لا يوجد مستخدمو إدارة بعد</p>}
        </div>
      </div>
    </div>
  );
}
