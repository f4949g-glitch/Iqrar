import { useState } from 'react';
import { User } from 'lucide-react';
import type { Profile } from '../types';
import { saveSignature, updateProfile } from '../api/authApi';
import { formatDate } from '@/shared/lib/formatDate';
import { fileToDataUrl } from '@/shared/lib/fileToDataUrl';
import { SignaturePad } from '@/shared/ui/SignaturePad';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { NATIONALITIES } from '@/shared/lib/nationalities';
import { emailError, nationalIdError, phoneError } from '@/shared/lib/validation';

const ROLE_LABEL: Record<string, string> = { admin: 'مدير المنصة', sub_admin: 'أدمن فرعي', member: 'عضو' };

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-3 last:border-0">
      <span className="text-xs font-bold text-slate">{label}</span>
      <span className="text-sm text-ink">{value}</span>
    </div>
  );
}

interface EditableProfileFields {
  full_name: string;
  national_id: string;
  email: string;
  nationality: string;
  date_of_birth: string;
  phone: string;
}

function toEditableFields(profile: Profile): EditableProfileFields {
  return {
    full_name: profile.full_name ?? '',
    national_id: profile.national_id ?? '',
    email: profile.email,
    nationality: profile.nationality || NATIONALITIES[0],
    date_of_birth: profile.date_of_birth ?? '',
    phone: profile.phone ?? '',
  };
}

function ProfileDetailsSection({ profile, onUpdated }: { profile: Profile; onUpdated?: () => void }) {
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<EditableProfileFields>(() => toEditableFields(profile));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const startEdit = () => {
    setFields(toEditableFields(profile));
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
      await updateProfile({
        full_name: fields.full_name.trim(),
        national_id: fields.national_id.trim(),
        email: fields.email.trim(),
        nationality: fields.nationality,
        date_of_birth: fields.date_of_birth || null,
        phone: fields.phone,
      });
      setEditing(false);
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر حفظ البيانات');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="rounded-xl border border-line bg-card p-5">
        <div className="mb-1 flex items-center justify-between">
          <h4 className="font-display text-sm font-bold text-ink">بياناتي</h4>
          <button type="button" onClick={startEdit} className="text-xs font-bold text-seal">
            تعديل البيانات
          </button>
        </div>
        <Row label="الاسم" value={profile.full_name || '—'} />
        <Row label="البريد الإلكتروني" value={profile.email} />
        <Row label="رقم الهوية" value={profile.national_id || '—'} />
        <Row label="الجنسية" value={profile.nationality || '—'} />
        <Row label="رقم الجوال" value={profile.phone || '—'} />
        <Row label="تاريخ الميلاد" value={profile.date_of_birth ? formatDate(profile.date_of_birth) : '—'} />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-card p-5">
      <h4 className="mb-4 font-display text-sm font-bold text-ink">تعديل بياناتي</h4>
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
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-seal"
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
      <div className="mt-4 flex items-center gap-2">
        <Button onClick={save} disabled={saving}>
          {saving ? 'جارِ الحفظ...' : 'حفظ التغييرات'}
        </Button>
        <Button variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
          إلغاء
        </Button>
      </div>
    </div>
  );
}

function SignatureSection({ profile }: { profile: Profile }) {
  const [signature, setSignature] = useState(profile.signature_data_url);
  const [pendingSignature, setPendingSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const save = async (dataUrl: string | null) => {
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      await saveSignature(dataUrl);
      setSignature(dataUrl);
      setPendingSignature(null);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر حفظ التوقيع');
    } finally {
      setSaving(false);
    }
  };

  const onUpload = async (file: File) => {
    const dataUrl = await fileToDataUrl(file);
    setPendingSignature(dataUrl);
  };

  return (
    <div className="rounded-xl border border-line bg-card p-5">
      <h4 className="mb-1 font-display text-sm font-bold text-ink">توقيعي المحفوظ</h4>
      <p className="mb-4 text-xs leading-relaxed text-slate">
        احفظ توقيعك هنا لاستخدامه لاحقًا عند التوقيع الإلكتروني على العقود. هذا التوقيع المحفوظ وحده لا يكفي — يُطلب منك
        دائمًا التحقق برمز يُرسل إلى جوالك المسجَّل عند فتح رابط التوقيع قبل السماح باستخدامه.
      </p>

      {signature && !pendingSignature && (
        <div className="mb-4">
          <img src={signature} alt="التوقيع المحفوظ" className="h-24 rounded-lg border border-line bg-white p-2" />
          <button type="button" onClick={() => save(null)} disabled={saving} className="mt-2 text-xs font-bold text-clay">
            حذف التوقيع المحفوظ
          </button>
        </div>
      )}

      {pendingSignature && (
        <div className="mb-4">
          <img src={pendingSignature} alt="معاينة التوقيع الجديد" className="h-24 rounded-lg border border-line bg-white p-2" />
        </div>
      )}

      <div className="mb-3">
        <SignaturePad onChange={(dataUrl) => setPendingSignature(dataUrl)} />
      </div>
      <div className="mb-4">
        <label className="text-xs font-bold text-seal">
          أو ارفع صورة توقيعك من جهازك
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
            }}
            className="mt-1.5 block w-full text-xs"
          />
        </label>
      </div>

      {error && <p className="mb-2 text-xs font-bold text-clay">{error}</p>}
      {success && <p className="mb-2 text-xs font-bold text-sage">تم حفظ التوقيع بنجاح</p>}

      <Button onClick={() => pendingSignature && save(pendingSignature)} disabled={saving || !pendingSignature}>
        {saving ? 'جارِ الحفظ...' : 'حفظ التوقيع'}
      </Button>
    </div>
  );
}

export function ProfilePage({ profile, onUpdated }: { profile: Profile; onUpdated?: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sealLight">
          <User size={28} className="text-seal" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">{profile.full_name || 'الملف الشخصي'}</h1>
          <p className="text-sm text-slate">{ROLE_LABEL[profile.role] ?? profile.role}</p>
        </div>
      </div>

      <ProfileDetailsSection profile={profile} onUpdated={onUpdated} />

      <SignatureSection profile={profile} />
    </div>
  );
}
