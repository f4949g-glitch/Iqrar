import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import type { Profile } from '../types';
import { confirmProfileChange, requestProfileChangeOtp, saveSignature, updateProfile, type ProfileChangeField } from '../api/authApi';
import { submitContactMessage } from '@/features/site/api/contactMessagesApi';
import { formatDate } from '@/shared/lib/formatDate';
import { fileToDataUrl } from '@/shared/lib/fileToDataUrl';
import { SignaturePad } from '@/shared/ui/SignaturePad';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { NATIONALITIES } from '@/shared/lib/nationalities';
import { emailError, phoneError } from '@/shared/lib/validation';

const ROLE_LABEL: Record<string, string> = { admin: 'مدير المنصة', sub_admin: 'أدمن فرعي', member: 'عضو' };

function Row({ label, value, action }: { label: string; value: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-0">
      <span className="text-xs font-bold text-slate">{label}</span>
      <span className="flex items-center gap-3">
        <span className="text-sm text-ink">{value}</span>
        {action}
      </span>
    </div>
  );
}

// طلب تغيير الاسم لم يعد يُطبَّق مباشرة — يُرفع كتذكرة إلى الأدمن (فئة
// name_change_request في نظام خدمة العملاء) ليراجعها ويطبّقها يدويًا.
function NameChangeRequest({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setError('');
    if (!newName.trim()) return setError('أدخل الاسم الجديد المطلوب');
    setSubmitting(true);
    try {
      await submitContactMessage({
        name: profile.full_name || profile.email,
        email: profile.email,
        phone: profile.phone,
        category: 'name_change_request',
        message: `طلب تغيير الاسم من "${profile.full_name || '—'}" إلى "${newName.trim()}"${note.trim() ? `\nملاحظة: ${note.trim()}` : ''}`,
      });
      setSent(true);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر إرسال الطلب');
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) return <span className="text-xs font-bold text-sage">أُرسل الطلب، سيراجعه الأدمن قريبًا</span>;

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-bold text-seal">
        طلب تغيير الاسم
      </button>
    );
  }

  return (
    <div className="mt-3 w-full rounded-lg border border-dashed border-seal bg-sealLight/30 p-3 sm:absolute sm:w-72">
      <p className="mb-2 text-xs text-slate">لا يمكن تعديل الاسم مباشرة — يُرسَل طلبك للأدمن ليراجعه ويطبّقه.</p>
      <Field label="الاسم الجديد المطلوب" value={newName} onChange={setNewName} required />
      <div className="mt-2">
        <Field label="ملاحظة (اختياري)" value={note} onChange={setNote} />
      </div>
      {error && <p className="mt-2 text-xs font-bold text-clay">{error}</p>}
      <div className="mt-3 flex items-center gap-2">
        <Button onClick={submit} disabled={submitting}>
          {submitting ? 'جارِ الإرسال...' : 'إرسال الطلب'}
        </Button>
        <Button variant="secondary" onClick={() => setOpen(false)} disabled={submitting}>
          إلغاء
        </Button>
      </div>
    </div>
  );
}

// تغيير البريد الإلكتروني أو الجوال: يُرسَل رمز تحقق إلى القيمة الحالية (القديمة)
// أولًا لإثبات ملكيتها، ثم يُدخِل المستخدم الرمز فتُطبَّق القيمة الجديدة.
function ChangeWithOtpFlow({
  field,
  label,
  placeholder,
  currentHint,
  onChanged,
}: {
  field: ProfileChangeField;
  label: string;
  placeholder: string;
  currentHint: string;
  onChanged: (newValue: string) => void;
}) {
  const [step, setStep] = useState<'closed' | 'enterNew' | 'enterCode'>('closed');
  const [newValue, setNewValue] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  const start = () => {
    setStep('enterNew');
    setNewValue('');
    setCode('');
    setDevCode('');
    setError('');
  };

  const requestOtp = async () => {
    setError('');
    if (field === 'email') {
      const err = emailError(newValue.trim());
      if (err) return setError(err);
    } else {
      const err = phoneError(newValue.trim());
      if (err) return setError(err);
    }
    setRequesting(true);
    try {
      const res = await requestProfileChangeOtp(field, newValue.trim());
      setDevCode(res.dev_code ?? '');
      setStep('enterCode');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر إرسال رمز التحقق');
    } finally {
      setRequesting(false);
    }
  };

  const confirm = async () => {
    setError('');
    if (!code.trim()) return setError('أدخل رمز التحقق');
    setConfirming(true);
    try {
      const res = await confirmProfileChange(field, code.trim());
      onChanged(res.new_value);
      setStep('closed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر التحقق من الرمز');
    } finally {
      setConfirming(false);
    }
  };

  if (step === 'closed') {
    return (
      <button type="button" onClick={start} className="text-xs font-bold text-seal">
        تغيير
      </button>
    );
  }

  return (
    <div className="mt-3 w-full rounded-lg border border-dashed border-seal bg-sealLight/30 p-3 sm:absolute sm:w-72">
      {step === 'enterNew' && (
        <>
          <Field label={label} value={newValue} onChange={setNewValue} placeholder={placeholder} required />
          <p className="mt-1.5 text-xs text-slate">{currentHint}</p>
          {error && <p className="mt-2 text-xs font-bold text-clay">{error}</p>}
          <div className="mt-3 flex items-center gap-2">
            <Button onClick={requestOtp} disabled={requesting}>
              {requesting ? 'جارِ الإرسال...' : 'إرسال رمز التحقق'}
            </Button>
            <Button variant="secondary" onClick={() => setStep('closed')} disabled={requesting}>
              إلغاء
            </Button>
          </div>
        </>
      )}
      {step === 'enterCode' && (
        <>
          <p className="mb-2 text-xs text-slate">{currentHint}</p>
          {devCode && <p className="mb-2 text-xs font-bold text-seal">وضع الاختبار: رمز التحقق هو {devCode}</p>}
          <Field label="رمز التحقق" value={code} onChange={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} placeholder="6 أرقام" />
          {error && <p className="mt-2 text-xs font-bold text-clay">{error}</p>}
          <div className="mt-3 flex items-center gap-2">
            <Button onClick={confirm} disabled={confirming}>
              {confirming ? 'جارِ التأكيد...' : 'تأكيد التغيير'}
            </Button>
            <Button variant="secondary" onClick={() => setStep('closed')} disabled={confirming}>
              إلغاء
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

interface EditableFields {
  nationality: string;
  date_of_birth: string;
}

function ProfileDetailsSection({ profile, onUpdated }: { profile: Profile; onUpdated?: () => void }) {
  const [displayProfile, setDisplayProfile] = useState(profile);
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<EditableFields>({ nationality: profile.nationality || NATIONALITIES[0], date_of_birth: profile.date_of_birth ?? '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const startEdit = () => {
    setFields({ nationality: displayProfile.nationality || NATIONALITIES[0], date_of_birth: displayProfile.date_of_birth ?? '' });
    setError('');
    setEditing(true);
  };

  const save = async () => {
    setError('');
    setSaving(true);
    try {
      const updated = await updateProfile({
        full_name: displayProfile.full_name ?? '',
        national_id: displayProfile.national_id ?? '',
        email: displayProfile.email,
        nationality: fields.nationality,
        date_of_birth: fields.date_of_birth || null,
        phone: displayProfile.phone ?? '',
      });
      setDisplayProfile(updated);
      setEditing(false);
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر حفظ البيانات');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-line bg-card p-5">
      <div className="mb-1 flex items-center justify-between">
        <h4 className="font-display text-sm font-bold text-ink">بياناتي</h4>
        {!editing && (
          <button type="button" onClick={startEdit} className="text-xs font-bold text-seal">
            تعديل الجنسية وتاريخ الميلاد
          </button>
        )}
      </div>

      <Row label="الاسم" value={displayProfile.full_name || '—'} action={<NameChangeRequest profile={displayProfile} />} />
      <Row
        label="البريد الإلكتروني"
        value={displayProfile.email}
        action={
          <ChangeWithOtpFlow
            field="email"
            label="البريد الإلكتروني الجديد"
            placeholder="name@example.com"
            currentHint={`سيُرسَل رمز تحقق إلى بريدك الحالي (${displayProfile.email}) لإثبات ملكيته أولًا`}
            onChanged={(v) => {
              setDisplayProfile((p) => ({ ...p, email: v }));
              onUpdated?.();
            }}
          />
        }
      />
      <Row label="رقم الهوية" value={displayProfile.national_id || '—'} action={<Link to="/contact" className="text-xs font-bold text-seal">تواصل مع الإدارة</Link>} />
      <Row label="الجنسية" value={displayProfile.nationality || '—'} />
      <Row
        label="رقم الجوال"
        value={displayProfile.phone || '—'}
        action={
          <ChangeWithOtpFlow
            field="phone"
            label="رقم الجوال الجديد"
            placeholder="966501234567"
            currentHint={displayProfile.phone ? `سيُرسَل رمز تحقق إلى جوالك الحالي (${displayProfile.phone}) لإثبات ملكيته أولًا` : 'لا يوجد رقم جوال مسجَّل، تواصل مع الإدارة'}
            onChanged={(v) => {
              setDisplayProfile((p) => ({ ...p, phone: v }));
              onUpdated?.();
            }}
          />
        }
      />
      <Row label="تاريخ الميلاد" value={displayProfile.date_of_birth ? formatDate(displayProfile.date_of_birth) : '—'} />

      {editing && (
        <div className="mt-4 rounded-lg border border-dashed border-seal bg-sealLight/30 p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          </div>
          {error && <p className="mt-3 text-sm font-bold text-clay">{error}</p>}
          <div className="mt-3 flex items-center gap-2">
            <Button onClick={save} disabled={saving}>
              {saving ? 'جارِ الحفظ...' : 'حفظ التغييرات'}
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
              إلغاء
            </Button>
          </div>
        </div>
      )}
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
