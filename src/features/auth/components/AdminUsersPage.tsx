import { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { Button } from '@/shared/ui/Button';
import { formatDate } from '@/shared/lib/formatDate';
import { NATIONALITIES } from '@/shared/lib/nationalities';
import { emailError, nationalIdError, phoneError } from '@/shared/lib/validation';
import {
  adminUpdateUserProfile,
  createSubAdmin,
  listAdminUsers,
  listAllUsers,
  manageUserAccount,
  updateSubAdminPermissions,
  type ManageUserAction,
} from '../api/adminUsersApi';
import { ADMIN_PERMISSION_LABELS, type AdminPermission, type Profile } from '../types';

const ALL_PERMISSIONS = Object.keys(ADMIN_PERMISSION_LABELS) as AdminPermission[];
const ROLE_LABEL: Record<string, string> = { admin: 'مدير المنصة', sub_admin: 'أدمن فرعي', member: 'عميل' };

interface EditableUserFields {
  full_name: string;
  national_id: string;
  email: string;
  nationality: string;
  date_of_birth: string;
  phone: string;
}

function toEditableUserFields(user: Profile): EditableUserFields {
  return {
    full_name: user.full_name ?? '',
    national_id: user.national_id ?? '',
    email: user.email,
    nationality: user.nationality || NATIONALITIES[0],
    date_of_birth: user.date_of_birth ?? '',
    phone: user.phone ?? '',
  };
}

const MANAGE_ACTION_CONFIRM: Record<ManageUserAction, string | null> = {
  suspend: 'هل تريد إيقاف حساب هذا العميل؟ لن يتمكن من تسجيل الدخول حتى تُعيد تفعيله.',
  reactivate: null,
  delete: 'هل أنت متأكد من حذف هذا الحساب نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.',
  reset_password: 'سيتم إنشاء كلمة مرور مؤقتة جديدة لهذا الحساب ويُطلب منه تغييرها عند الدخول. هل تريد المتابعة؟',
};

// إجراءات إدارة حساب عميل: إيقاف/إعادة تفعيل/حذف/إعادة تعيين كلمة مرور —
// متاحة فقط لحسابات العملاء (role === 'member')، إذ لا تنطبق على حسابات الإدارة.
function CustomerAccountActions({
  user,
  onPatched,
  onDeleted,
}: {
  user: Profile;
  onPatched: (patch: Partial<Profile>) => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState<ManageUserAction | null>(null);
  const [error, setError] = useState('');
  const [tempPassword, setTempPassword] = useState('');

  const run = async (action: ManageUserAction) => {
    const confirmMsg = MANAGE_ACTION_CONFIRM[action];
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setError('');
    setBusy(action);
    try {
      const result = await manageUserAccount(user.id, action);
      if (action === 'suspend') onPatched({ suspended_at: new Date().toISOString() });
      else if (action === 'reactivate') onPatched({ suspended_at: null });
      else if (action === 'delete') onDeleted();
      else if (action === 'reset_password' && result.temp_password) {
        onPatched({ must_change_password: true });
        setTempPassword(result.temp_password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تنفيذ الإجراء');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-2 border-t border-line pt-2">
      <div className="flex flex-wrap items-center gap-2">
        {user.suspended_at ? (
          <button type="button" onClick={() => run('reactivate')} disabled={busy !== null} className="text-xs font-bold text-sage">
            {busy === 'reactivate' ? 'جارِ إعادة التفعيل...' : 'إعادة تفعيل الحساب'}
          </button>
        ) : (
          <button type="button" onClick={() => run('suspend')} disabled={busy !== null} className="text-xs font-bold text-clay">
            {busy === 'suspend' ? 'جارِ الإيقاف...' : 'إيقاف الحساب'}
          </button>
        )}
        <button type="button" onClick={() => run('reset_password')} disabled={busy !== null} className="text-xs font-bold text-seal">
          {busy === 'reset_password' ? 'جارِ إعادة التعيين...' : 'إعادة تعيين كلمة المرور'}
        </button>
        <button type="button" onClick={() => run('delete')} disabled={busy !== null} className="text-xs font-bold text-clay">
          {busy === 'delete' ? 'جارِ الحذف...' : 'حذف الحساب'}
        </button>
        {user.suspended_at && <span className="text-xs text-slate">موقوف منذ {formatDate(user.suspended_at)}</span>}
      </div>
      {error && <p className="mt-2 text-xs font-bold text-clay">{error}</p>}
      {tempPassword && (
        <div className="mt-2 rounded-lg bg-sealLight p-2.5 text-xs font-bold text-seal">
          كلمة المرور المؤقتة الجديدة: <span dir="ltr">{tempPassword}</span> — أرسلها للعميل يدويًا (رسالة نصية أو رابط خارج
          النظام)، وسيُطلب منه تغييرها عند أول دخول باستخدامها.
        </div>
      )}
    </div>
  );
}

function UserEditRow({ user, onSaved, onDeleted }: { user: Profile; onSaved: (updated: Profile) => void; onDeleted: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<EditableUserFields>(() => toEditableUserFields(user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const startEdit = () => {
    setFields(toEditableUserFields(user));
    setError('');
    setEditing(true);
  };

  const save = async () => {
    setError('');
    const idError = nationalIdError(fields.national_id);
    if (idError) return setError(idError);
    const mailError = emailError(fields.email);
    if (mailError) return setError(mailError);
    if (fields.phone) {
      const phError = phoneError(fields.phone);
      if (phError) return setError(phError);
    }
    if (!fields.full_name.trim()) return setError('الاسم مطلوب');

    setSaving(true);
    try {
      const updated = await adminUpdateUserProfile(user.id, {
        full_name: fields.full_name.trim(),
        national_id: fields.national_id.trim(),
        email: fields.email.trim(),
        nationality: fields.nationality,
        date_of_birth: fields.date_of_birth || null,
        phone: fields.phone,
      });
      onSaved(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر حفظ البيانات');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="rounded-lg border border-line p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-ink">
              {user.full_name || user.email} {user.suspended_at && <span className="text-clay">(موقوف)</span>}
            </p>
            <p className="text-xs text-slate">
              {ROLE_LABEL[user.role] ?? user.role} · {user.national_id || '—'} · {user.email} · منذ {formatDate(user.created_at)}
            </p>
          </div>
          <button type="button" onClick={startEdit} className="text-xs font-bold text-seal">
            تعديل البيانات
          </button>
        </div>
        {user.role === 'member' && (
          <CustomerAccountActions
            user={user}
            onPatched={(patch) => onSaved({ ...user, ...patch })}
            onDeleted={() => onDeleted(user.id)}
          />
        )}
      </div>
    );
  }

  return (
    <form
      className="rounded-lg border border-line p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!saving) save();
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="الاسم" value={fields.full_name} onChange={(v) => setFields((f) => ({ ...f, full_name: v }))} required />
        <Field
          label="رقم الهوية أو الإقامة"
          value={fields.national_id}
          onChange={(v) => setFields((f) => ({ ...f, national_id: v }))}
          digitsOnly
          maxLength={10}
          required
          hint="10 أرقام فقط"
        />
        <Field label="البريد الإلكتروني" value={fields.email} onChange={(v) => setFields((f) => ({ ...f, email: v }))} type="email" required />
        <label className="block text-sm">
          <span className="mb-1 block font-bold text-ink">الجنسية</span>
          <select
            value={fields.nationality}
            onChange={(e) => setFields((f) => ({ ...f, nationality: e.target.value }))}
            className="w-full rounded-lg border border-line bg-card px-3 py-2 text-ink outline-none focus:border-seal"
          >
            {NATIONALITIES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <Field label="تاريخ الميلاد" value={fields.date_of_birth} onChange={(v) => setFields((f) => ({ ...f, date_of_birth: v }))} type="date" />
        <Field label="رقم الجوال" value={fields.phone} onChange={(v) => setFields((f) => ({ ...f, phone: v }))} phone />
      </div>
      {error && <p className="mt-3 text-sm font-bold text-clay">{error}</p>}
      <div className="mt-3 flex items-center gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'جارِ الحفظ...' : 'حفظ التغييرات'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}

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

  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [allUsersLoading, setAllUsersLoading] = useState(true);
  const [allUsersError, setAllUsersError] = useState('');

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

  const loadAllUsers = async () => {
    setAllUsersLoading(true);
    try {
      setAllUsers(await listAllUsers());
    } catch (err) {
      setAllUsersError(err instanceof Error ? err.message : 'تعذّر تحميل قائمة المستخدمين');
    } finally {
      setAllUsersLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadAllUsers();
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

      <form
        className="rounded-xl border border-line bg-card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!creating) create();
        }}
      >
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
          <Button type="submit" disabled={creating}>
            <span className="flex items-center gap-1.5">
              <UserPlus size={16} /> {creating ? 'جارِ الإنشاء...' : 'إنشاء الحساب'}
            </span>
          </Button>
        </div>
      </form>

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

      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="mb-1 font-display text-sm font-bold text-ink">بيانات جميع المستخدمين</h2>
        <p className="mb-4 text-xs text-slate">تعديل الاسم ورقم الهوية والبريد الإلكتروني والجنسية وتاريخ الميلاد ورقم الجوال لأي مستخدم (مثلًا في حال وجود خطأ في البيانات أو طلب تصحيح).</p>
        {allUsersLoading && <p className="text-sm text-slate">جارِ التحميل...</p>}
        {allUsersError && <p className="text-sm font-bold text-clay">{allUsersError}</p>}
        <div className="space-y-3">
          {allUsers.map((u) => (
            <UserEditRow
              key={u.id}
              user={u}
              onSaved={(updated) => setAllUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))}
              onDeleted={(id) => setAllUsers((prev) => prev.filter((x) => x.id !== id))}
            />
          ))}
          {!allUsersLoading && allUsers.length === 0 && <p className="text-sm text-slate">لا يوجد مستخدمون بعد</p>}
        </div>
      </div>
    </div>
  );
}
