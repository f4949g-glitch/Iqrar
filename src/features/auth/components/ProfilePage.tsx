import { useState } from 'react';
import { User } from 'lucide-react';
import type { Profile } from '../types';
import { saveSignature } from '../api/authApi';
import { formatDate } from '@/shared/lib/formatDate';
import { fileToDataUrl } from '@/shared/lib/fileToDataUrl';
import { SignaturePad } from '@/shared/ui/SignaturePad';
import { Button } from '@/shared/ui/Button';

const ROLE_LABEL: Record<string, string> = { admin: 'مدير المنصة', member: 'عضو' };

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-3 last:border-0">
      <span className="text-xs font-bold text-slate">{label}</span>
      <span className="text-sm text-ink">{value}</span>
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

export function ProfilePage({ profile }: { profile: Profile }) {
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

      <div className="rounded-xl border border-line bg-card p-5">
        <Row label="البريد الإلكتروني" value={profile.email} />
        <Row label="رقم الهوية" value={profile.national_id || '—'} />
        <Row label="الجنسية" value={profile.nationality || '—'} />
        <Row label="رقم الجوال" value={profile.phone || '—'} />
        <Row label="تاريخ الميلاد" value={profile.date_of_birth ? formatDate(profile.date_of_birth) : '—'} />
      </div>

      <SignatureSection profile={profile} />
    </div>
  );
}
