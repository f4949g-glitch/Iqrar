import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, FileSignature, ShieldCheck } from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { Button } from '@/shared/ui/Button';
import { verifyDocument, type VerifyResult } from '../api/verifyApi';
import { DOCUMENT_TYPE_LABELS } from '@/features/contracts/types';

const PARTY_STATUS_LABEL: Record<string, string> = {
  pending: 'بانتظار التوقيع',
  viewed: 'تمت المشاهدة',
  signed: 'وقّع',
  rejected: 'مرفوض',
};

export function VerifyPage() {
  const [searchParams] = useSearchParams();
  const [verificationNumber, setVerificationNumber] = useState(searchParams.get('number') ?? '');
  const [isPoa, setIsPoa] = useState(false);
  const [nationalId1, setNationalId1] = useState('');
  const [nationalId2, setNationalId2] = useState('');
  const [completedDate, setCompletedDate] = useState('');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const data = await verifyDocument({
        verificationNumber,
        nationalId1,
        nationalId2: isPoa ? undefined : nationalId2,
        completedDate: isPoa ? completedDate : undefined,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر التحقق');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full rounded-lg border border-line bg-white px-3 py-2.5 text-right text-ink outline-none focus:border-seal';

  return (
    <div dir="rtl" className="min-h-screen bg-hero">
      <header className="border-b border-line bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-seal">
              <FileSignature size={18} className="text-white" />
            </div>
            <span className="font-display text-lg font-extrabold text-ink">إقرار</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-12">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-sealLight">
            <ShieldCheck size={26} className="text-seal" />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-ink">التحقق من صحة وثيقة</h1>
          <p className="mt-1 text-sm text-slate">أدخل رقم التوثيق وبيانات الأطراف كما هي في الوثيقة للتأكد من صحتها</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-card p-6 shadow-sm">
          <Field label="رقم التوثيق" value={verificationNumber} onChange={setVerificationNumber} required />

          <div className="flex gap-1.5 rounded-lg bg-paper p-1">
            <button
              type="button"
              onClick={() => setIsPoa(false)}
              className={`flex-1 rounded-md py-1.5 text-xs font-bold transition ${!isPoa ? 'bg-card text-ink shadow-sm' : 'text-slate'}`}
            >
              {DOCUMENT_TYPE_LABELS.contract}
            </button>
            <button
              type="button"
              onClick={() => setIsPoa(true)}
              className={`flex-1 rounded-md py-1.5 text-xs font-bold transition ${isPoa ? 'bg-card text-ink shadow-sm' : 'text-slate'}`}
            >
              {DOCUMENT_TYPE_LABELS.power_of_attorney}
            </button>
          </div>

          {isPoa ? (
            <>
              <Field label="رقم هوية الطرف" value={nationalId1} onChange={setNationalId1} required />
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate">تاريخ التوثيق</label>
                <input required type="date" value={completedDate} onChange={(e) => setCompletedDate(e.target.value)} className={inputClass} style={{ direction: 'ltr' }} />
              </div>
            </>
          ) : (
            <>
              <Field label="رقم هوية الطرف الأول" value={nationalId1} onChange={setNationalId1} required />
              <Field label="رقم هوية الطرف الثاني" value={nationalId2} onChange={setNationalId2} required />
            </>
          )}

          {error && (
            <p role="alert" className="text-sm font-bold text-clay">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full py-3">
            {loading ? 'جارِ التحقق...' : 'تحقّق'}
          </Button>
        </form>

        {result && (
          <div className="mt-6 rounded-2xl bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sage">
              <CheckCircle2 size={22} />
              <p className="font-display font-bold">وثيقة صحيحة وموثّقة</p>
            </div>
            <div className="mb-4 space-y-1 text-sm text-ink">
              <p>
                <span className="font-bold">العنوان:</span> {result.title}
              </p>
              <p>
                <span className="font-bold">نوع الوثيقة:</span> {DOCUMENT_TYPE_LABELS[result.document_type]}
              </p>
              <p>
                <span className="font-bold">رقم التوثيق:</span> <span dir="ltr">{result.verification_number}</span>
              </p>
              <p>
                <span className="font-bold">تاريخ التوثيق:</span> {new Date(result.completed_at).toLocaleDateString('ar-SA')}
              </p>
            </div>
            <h2 className="mb-2 font-display text-sm font-bold text-ink">الأطراف والتواقيع ({result.parties.length})</h2>
            <ul className="space-y-2">
              {result.parties.map((p, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg border border-line p-2.5 text-sm">
                  <span className="font-bold text-ink">
                    {p.party_full_name ?? '—'} <span className="font-normal text-slate">({p.party_role_label})</span>
                  </span>
                  <span className="text-xs font-bold text-sage">{PARTY_STATUS_LABEL[p.party_status] ?? p.party_status}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
