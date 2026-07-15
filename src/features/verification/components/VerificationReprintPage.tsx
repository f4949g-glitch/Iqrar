import { useState } from 'react';
import { Printer, Search } from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { Button } from '@/shared/ui/Button';
import { fetchVerificationReprint } from '../api/adminReprintApi';

export function VerificationReprintPage() {
  const [verificationNumber, setVerificationNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ html: string; title: string } | null>(null);

  const search = async () => {
    setError('');
    setResult(null);
    if (!verificationNumber.trim()) {
      setError('رقم التوثيق مطلوب');
      return;
    }
    setLoading(true);
    try {
      const data = await fetchVerificationReprint(verificationNumber.trim());
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر جلب معلومات التوثيق');
    } finally {
      setLoading(false);
    }
  };

  const print = () => {
    if (!result) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(result.html);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">إعادة طباعة معلومات التوثيق</h1>
        <p className="mt-1 text-sm text-slate">
          لحالات الأعطال التقنية: أدخل رقم توثيق عقد أو تفويض مكتمل لعرض بياناته وباركود التحقق مجددًا وطباعتها مباشرة.
        </p>
      </div>

      <div className="rounded-xl border border-line bg-card p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="رقم التوثيق" value={verificationNumber} onChange={setVerificationNumber} required />
          <Button onClick={search} disabled={loading}>
            <span className="flex items-center gap-1.5">
              <Search size={16} /> {loading ? 'جارِ البحث...' : 'بحث'}
            </span>
          </Button>
        </div>
        {error && <p className="mt-3 text-sm font-bold text-clay">{error}</p>}
      </div>

      {result && (
        <div className="rounded-xl border border-line bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-ink">{result.title}</h2>
            <Button onClick={print}>
              <span className="flex items-center gap-1.5">
                <Printer size={16} /> طباعة
              </span>
            </Button>
          </div>
          <iframe title="معاينة" srcDoc={result.html} className="h-[500px] w-full rounded-lg border border-line bg-card" />
        </div>
      )}
    </div>
  );
}
