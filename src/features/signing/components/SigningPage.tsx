import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Document, Page } from 'react-pdf';
import { CheckCircle2, FileSignature } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { SignaturePad } from '@/shared/ui/SignaturePad';
import { fetchSigningSession, submitSignature, type SigningSession } from '../api/signingApi';
import { renderContractHtml, renderPartiesHeaderHtml, type JsonNode } from '@/features/contracts/editor/renderContractHtml';
import '@/lib/pdf/setupWorker';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function FieldInput({ field, value, onChange }: { field: SigningSession['fields'][number]; value: unknown; onChange: (v: unknown) => void }) {
  switch (field.field_type) {
    case 'signature':
      return <SignaturePad onChange={(dataUrl) => onChange(dataUrl)} />;
    case 'checkbox':
      return (
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
          {field.label}
        </label>
      );
    case 'select':
      return (
        <select
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-seal"
        >
          <option value="" disabled>
            اختر...
          </option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    case 'textarea':
      return (
        <textarea
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-seal"
        />
      );
    case 'image':
    case 'logo':
    case 'stamp':
    case 'file':
      return (
        <input
          type="file"
          accept={field.field_type === 'file' ? undefined : 'image/*'}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) onChange(await fileToDataUrl(file));
          }}
          className="w-full text-xs"
        />
      );
    default:
      return (
        <input
          type={field.field_type === 'date' ? 'date' : field.field_type === 'time' ? 'time' : field.field_type === 'number' ? 'number' : 'text'}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-seal"
        />
      );
  }
}

export function SigningPage() {
  const { token } = useParams<{ token: string }>();
  const [session, setSession] = useState<SigningSession | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ completed: boolean } | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchSigningSession(token);
      setSession(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تحميل الإقرار');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!token || !session) return;
    const missing = session.fields.find((f) => f.required && !values[f.id]);
    if (missing) {
      setError(`الحقل "${missing.label}" مطلوب`);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await submitSignature(token, values);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر إرسال التوقيع');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <p className="text-sm text-slate">جارِ التحميل...</p>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper p-4" dir="rtl">
        <div className="max-w-sm rounded-2xl bg-card p-8 text-center shadow-xl">
          <p className="font-bold text-clay">{error}</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  if (result || session.party.status === 'signed') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper p-4" dir="rtl">
        <div className="max-w-sm rounded-2xl bg-card p-8 text-center shadow-xl">
          <CheckCircle2 size={40} className="mx-auto mb-3 text-sage" />
          <h2 className="mb-2 font-display text-lg font-bold text-ink">تم استلام توقيعك بنجاح</h2>
          <p className="text-sm text-slate">
            {result?.completed
              ? 'اكتمل توثيق العقد من جميع الأطراف.'
              : 'شكرًا لك، بانتظار استكمال بقية الأطراف لتوثيق العقد.'}
          </p>
        </div>
      </div>
    );
  }

  if (!['pending', 'partially_completed'].includes(session.contract.status)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper p-4" dir="rtl">
        <div className="max-w-sm rounded-2xl bg-card p-8 text-center shadow-xl">
          <p className="font-bold text-clay">هذا العقد لم يعد قابلًا للتوقيع حاليًا</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper" dir="rtl">
      <header className="border-b border-line bg-card p-4">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-seal">
            <FileSignature size={18} className="text-white" />
          </div>
          <div>
            <p className="font-display text-sm font-bold text-ink">{session.contract.title}</p>
            <p className="text-xs text-slate">
              مرحبًا {session.party.full_name} ({session.party.role_label})
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 p-4">
        {session.contract.source_type === 'editor' && Boolean(session.contract.body_json) && session.all_parties && (
          <div className="rounded-xl border border-line bg-card p-6">
            <div
              className="prose max-w-none text-sm text-ink"
              dangerouslySetInnerHTML={{
                __html: renderPartiesHeaderHtml(session.all_parties) + renderContractHtml(session.contract.body_json as JsonNode, session.all_parties),
              }}
            />
          </div>
        )}

        {session.pdf_url && (
          <div className="flex justify-center overflow-auto rounded-xl border border-line bg-[#525659] p-4">
            <Document file={session.pdf_url} loading={<p className="p-10 text-sm text-white">جارِ تحميل المستند...</p>}>
              {Array.from({ length: session.contract.page_count }, (_, i) => i + 1).map((pageNumber) => (
                <div key={pageNumber} className="relative mb-3 bg-white shadow-lg">
                  <Page pageNumber={pageNumber} width={600} />
                  {session.fields
                    .filter((f) => f.page_number === pageNumber)
                    .map((f) => (
                      <div
                        key={f.id}
                        className="absolute rounded border-2 border-seal bg-white/90 p-0.5"
                        style={{
                          left: `${f.pos_x}%`,
                          top: `${f.pos_y}%`,
                          width: `${f.width}%`,
                          height: `${f.height}%`,
                        }}
                      >
                        <div className="h-full w-full overflow-hidden text-[10px]">
                          <FieldInput field={f} value={values[f.id]} onChange={(v) => setValues((prev) => ({ ...prev, [f.id]: v }))} />
                        </div>
                      </div>
                    ))}
                </div>
              ))}
            </Document>
          </div>
        )}

        <div className="rounded-xl border border-line bg-card p-5">
          <h3 className="mb-4 font-display text-sm font-bold text-ink">تعبئة الحقول المطلوبة</h3>
          <div className="space-y-4">
            {session.fields.map((f) => (
              <div key={f.id}>
                <p className="mb-1 text-xs font-bold text-slate">
                  {f.label} {f.required && <span className="text-clay">*</span>}
                </p>
                <FieldInput field={f} value={values[f.id]} onChange={(v) => setValues((prev) => ({ ...prev, [f.id]: v }))} />
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm font-bold text-clay">{error}</p>}

        <Button onClick={submit} disabled={submitting} className="w-full py-3">
          {submitting ? 'جارِ الإرسال...' : 'الموافقة وإتمام التوثيق'}
        </Button>
      </main>
    </div>
  );
}
