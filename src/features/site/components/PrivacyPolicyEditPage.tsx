import { useEffect, useState } from 'react';
import { ShieldQuestion } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { formatDateTime } from '@/shared/lib/formatDate';
import { fetchLegalPage, updateLegalPage, parseLegalSections } from '../api/legalApi';

export function PrivacyPolicyEditPage() {
  const [content, setContent] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchLegalPage('privacy_policy')
      .then((p) => {
        setContent(p.content);
        setUpdatedAt(p.updated_at);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'تعذّر تحميل الصفحة'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      await updateLegalPage('privacy_policy', content);
      setUpdatedAt(new Date().toISOString());
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر حفظ التعديلات');
    } finally {
      setSaving(false);
    }
  };

  const previewSections = parseLegalSections(content);

  if (loading) return <p className="text-sm text-slate">جارِ التحميل...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-sealLight">
          <ShieldQuestion size={20} className="text-seal" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">تعديل سياسة الخصوصية</h1>
          <p className="text-sm text-slate">آخر تحديث: {formatDateTime(updatedAt)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="mb-2 font-display text-sm font-bold text-ink">المحتوى</h2>
        <p className="mb-3 text-xs text-slate">
          يبدأ كل قسم بسطر <code dir="ltr">## عنوان القسم</code> يليه نص القسم في الأسطر التالية.
        </p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={18}
          dir="rtl"
          className="w-full rounded-lg border border-line bg-card px-3 py-2 font-mono text-sm text-ink outline-none focus:border-seal"
        />
      </div>

      {error && <p className="text-sm font-bold text-clay">{error}</p>}
      {saved && <p className="text-sm font-bold text-sage">تم الحفظ بنجاح</p>}
      <Button onClick={save} disabled={saving}>
        {saving ? 'جارِ الحفظ...' : 'حفظ التعديلات'}
      </Button>

      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="mb-4 font-display text-sm font-bold text-ink">معاينة</h2>
        <div className="space-y-4">
          {previewSections.map((s, i) => (
            <div key={i} className="rounded-lg border border-line p-4">
              <h3 className="mb-1.5 font-display text-sm font-bold text-ink">{s.title}</h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate">{s.body}</p>
            </div>
          ))}
          {previewSections.length === 0 && <p className="text-sm text-slate">لا يوجد محتوى بعد</p>}
        </div>
      </div>
    </div>
  );
}
