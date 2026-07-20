import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Document, Page } from 'react-pdf';
import { CheckCircle2, Clock, FileSignature, ShieldCheck, XCircle } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { SignaturePad } from '@/shared/ui/SignaturePad';
import {
  fetchSigningSession,
  submitSignature,
  rejectSignature,
  requestSigningOtp,
  verifySigningOtp,
  type SigningSession,
  type SigningFullSession,
} from '../api/signingApi';
import { renderContractHtml, renderPartiesHeaderHtml, type FillValue, type JsonNode } from '@/features/contracts/editor/renderContractHtml';
import { FIELD_TYPE_ICONS } from '@/features/contracts/lib/fieldTypeIcons';
import { FIELD_TYPE_LABELS } from '@/features/contracts/types';
import { fileToDataUrl } from '@/shared/lib/fileToDataUrl';
import { SigningIdentityGate } from './SigningIdentityGate';
import '@/lib/pdf/setupWorker';

// يتيح للطرف الموقّع استخدام توقيعه المحفوظ مسبقًا في ملفه الشخصي بدل الرسم من
// جديد، لكن فقط بعد التحقق برمز يُرسل لجواله المسجَّل عند طلبه هنا تحديدًا —
// التوقيع المحفوظ وحده لا يُستخدم تلقائيًا أبدًا. التحقق يتم مرة واحدة فقط لكل
// جلسة توقيع: القيمة المُتحقَّق منها تُخزَّن أعلى المستوى (SigningPage) وتُمرَّر
// كـcachedDataUrl، فإن وُجدت تُستخدم مباشرة بلا إعادة طلب رمز لكل حقل توقيع لاحق.
function SavedSignatureField({
  token,
  onChange,
  cachedDataUrl,
  onVerified,
}: {
  token: string;
  onChange: (dataUrl: string | null) => void;
  cachedDataUrl: string | null;
  onVerified: (dataUrl: string) => void;
}) {
  const [mode, setMode] = useState<'choice' | 'otp' | 'done' | 'draw'>(cachedDataUrl ? 'done' : 'choice');
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState('');
  const [phoneHint, setPhoneHint] = useState('');
  const [devCode, setDevCode] = useState('');
  const [error, setError] = useState('');

  // كل حقول التوقيع تُركَّب دفعة واحدة قبل أي تحقق OTP، فتكون cachedDataUrl فارغة
  // عند التركيب دائمًا — لذا يعتمد الأثر على قيمتها لا على مصفوفة تبعيات فارغة،
  // كي ينعكس التحقق الذي تم لأول حقل توقيع فورًا على بقية الحقول (mode أيضًا،
  // لا onChange فقط) دون إعادة طلب رمز SMS لكل حقل توقيع منفصل.
  useEffect(() => {
    if (cachedDataUrl) {
      onChange(cachedDataUrl);
      setMode('done');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cachedDataUrl]);

  const requestOtp = async () => {
    setRequesting(true);
    setError('');
    try {
      const res = await requestSigningOtp(token);
      setPhoneHint(res.phone_hint);
      setDevCode(res.sms_configured ? '' : res.dev_code ?? '');
      setMode('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر إرسال رمز التحقق');
    } finally {
      setRequesting(false);
    }
  };

  const verify = async () => {
    setVerifying(true);
    setError('');
    try {
      const res = await verifySigningOtp(token, code.trim());
      onChange(res.signature_data_url);
      onVerified(res.signature_data_url);
      setMode('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر التحقق من الرمز');
    } finally {
      setVerifying(false);
    }
  };

  if (mode === 'draw') return <SignaturePad onChange={onChange} />;

  if (mode === 'done') {
    return <p className="text-xs font-bold text-sage">✓ تم استخدام توقيعك المحفوظ بعد التحقق من رقم جوالك</p>;
  }

  if (mode === 'otp') {
    return (
      <div className="space-y-2 rounded-lg border border-dashed border-seal bg-sealLight p-3">
        <p className="text-xs font-bold text-ink">أُرسل رمز تحقق إلى جوالك ({phoneHint})</p>
        {devCode && <p className="text-xs text-slate">رمز الاختبار (بوابة SMS غير مُفعَّلة بعد): {devCode}</p>}
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          placeholder="رمز التحقق"
          className="w-full rounded-lg border border-line bg-card px-3 py-2 text-center text-sm text-ink outline-none focus:border-seal"
        />
        {error && <p className="text-xs font-bold text-clay">{error}</p>}
        <Button onClick={verify} disabled={verifying || code.trim().length < 4}>
          {verifying ? 'جارِ التحقق...' : 'تحقق واستخدم التوقيع'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={requestOtp}
        disabled={requesting}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-seal bg-sealLight px-3 py-2 text-xs font-bold text-seal"
      >
        <ShieldCheck size={14} /> {requesting ? 'جارِ الإرسال...' : 'استخدام توقيعي المحفوظ (تحقق عبر الجوال)'}
      </button>
      {error && <p className="text-xs font-bold text-clay">{error}</p>}
      <button type="button" onClick={() => setMode('draw')} className="w-full text-center text-xs font-bold text-slate hover:text-ink">
        أو ارسم توقيعًا جديدًا
      </button>
    </div>
  );
}

// بطاقتا اختيار طريقة التوقيع (رسم/صورة مرفقة) — تظهر مرة واحدة فقط لكل طرف
// (عند أول حقل توقيع بلا توقيع محفوظ)، وتُطبَّق الطريقة المُختارة تلقائيًا على
// أي حقل توقيع لاحق لنفس الطرف في هذا العقد.
function SignatureMethodChoice({ onChoose }: { onChoose: (method: 'draw' | 'upload') => void }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => onChoose('draw')}
        className="flex items-center gap-2 rounded-xl border-2 border-line bg-card p-3 text-start shadow-sm transition hover:border-sealMuted hover:shadow-md"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-paper text-sealMuted">
          <FileSignature size={18} />
        </span>
        <span>
          <span className="block text-sm font-bold text-ink">رسم التوقيع</span>
          <span className="block text-[11px] text-slate">وقّع بإصبعك أو الفأرة</span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => onChoose('upload')}
        className="flex items-center gap-2 rounded-xl border-2 border-line bg-card p-3 text-start shadow-sm transition hover:border-sealMuted hover:shadow-md"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-paper text-sealMuted">
          <CheckCircle2 size={18} />
        </span>
        <span>
          <span className="block text-sm font-bold text-ink">إرفاق صورة توقيع</span>
          <span className="block text-[11px] text-slate">ارفع صورة توقيعك الجاهزة</span>
        </span>
      </button>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  token,
  hasSavedSignature,
  signatureMethod,
  onChooseSignatureMethod,
  savedSignatureDataUrl,
  onSavedSignatureVerified,
}: {
  field: SigningFullSession['fields'][number];
  value: unknown;
  onChange: (v: unknown) => void;
  token: string;
  hasSavedSignature: boolean;
  signatureMethod: 'draw' | 'upload' | null;
  onChooseSignatureMethod: (method: 'draw' | 'upload') => void;
  savedSignatureDataUrl: string | null;
  onSavedSignatureVerified: (dataUrl: string) => void;
}) {
  switch (field.field_type) {
    case 'signature': {
      if (hasSavedSignature) {
        return (
          <SavedSignatureField
            token={token}
            onChange={(dataUrl) => onChange(dataUrl)}
            cachedDataUrl={savedSignatureDataUrl}
            onVerified={onSavedSignatureVerified}
          />
        );
      }
      if (signatureMethod === null) {
        return <SignatureMethodChoice onChoose={onChooseSignatureMethod} />;
      }
      if (signatureMethod === 'upload') {
        return (
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) onChange(await fileToDataUrl(file));
            }}
            className="w-full text-xs"
          />
        );
      }
      return <SignaturePad onChange={(dataUrl) => onChange(dataUrl)} />;
    }
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
          className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-seal"
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
          className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-seal"
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
          type={
            field.field_type === 'date'
              ? 'date'
              : field.field_type === 'time'
                ? 'time'
                : field.field_type === 'number'
                  ? 'number'
                  : field.field_type === 'email'
                    ? 'email'
                    : field.field_type === 'phone'
                      ? 'tel'
                      : 'text'
          }
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-seal"
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
  const [rejected, setRejected] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // مزامنة حيّة لما يكتبه الطرف في لوحة تعبئة الحقول أسفل المستند مع معاينة
  // العقد نفسها أعلاه، بدل بقاء المعاينة عند العنصر النائب الفارغ حتى التوقيع
  // النهائي. تُبنى فقط للحقول ذات anchor_id (المرتبطة بموضع داخل نص العقد).
  const liveFillValues = useMemo(() => {
    if (!session || !('fields' in session)) return {};
    const result: Record<string, FillValue> = {};
    for (const f of session.fields) {
      if (!f.anchor_id) continue;
      const v = values[f.id];
      if (v === undefined || v === null || v === '') continue;
      const isImageType = f.field_type === 'signature' || f.field_type === 'image' || f.field_type === 'logo' || f.field_type === 'stamp';
      result[f.anchor_id] = {
        fieldType: f.field_type,
        value: v,
        resolvedImageUrl: isImageType && typeof v === 'string' ? v : undefined,
      };
    }
    return result;
  }, [session, values]);
  const [rejecting, setRejecting] = useState(false);
  const [agreedToDeclaration, setAgreedToDeclaration] = useState(false);
  // طريقة توقيع واحدة لكامل حقول التوقيع في هذا العقد (رسم أو صورة مرفقة) —
  // تُختار مرة واحدة عند أول حقل توقيع ثم تُطبَّق تلقائيًا على أي حقل توقيع آخر
  // لنفس الطرف، بدل السماح بخلط الطريقتين داخل العقد الواحد.
  const [signatureMethod, setSignatureMethod] = useState<'draw' | 'upload' | null>(null);
  // توقيع محفوظ مُتحقَّق منه مرة واحدة عبر رمز SMS لهذه الجلسة — يُعاد استخدامه
  // تلقائيًا لأي حقل توقيع لاحق لنفس الطرف بلا إعادة طلب الرمز.
  const [savedSignatureDataUrl, setSavedSignatureDataUrl] = useState<string | null>(null);

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
    if (!token || !session || session.otp_required || session.waiting_for_turn) return;
    if (!agreedToDeclaration) {
      setError('يجب الموافقة على إقرار التوقيع أدناه أولًا');
      return;
    }
    const missing = session.fields.find((f) => f.required && !values[f.id]);
    if (missing) {
      setError(`الحقل "${missing.label}" مطلوب`);
      return;
    }
    // تحقق من تنسيق كل حقل مُعبَّأ حسب نوعه، برسالة تحدِّد اسم الحقل والمشكلة
    // بالضبط بدل رسالة عامة واحدة لكل أنواع الأخطاء.
    for (const f of session.fields) {
      const v = values[f.id];
      if (v === undefined || v === null || v === '') continue;
      if (f.field_type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v))) {
        setError(`الحقل "${f.label}" يجب أن يكون بريدًا إلكترونيًا صحيحًا`);
        return;
      }
      if (f.field_type === 'phone' && !/^\d{9,15}$/.test(String(v).replace(/\D/g, ''))) {
        setError(`الحقل "${f.label}" يجب أن يكون رقم جوال صحيحًا`);
        return;
      }
      if (f.field_type === 'number' && Number.isNaN(Number(v))) {
        setError(`الحقل "${f.label}" يجب أن يكون رقمًا`);
        return;
      }
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

  const reject = async () => {
    if (!token) return;
    setRejecting(true);
    setError('');
    try {
      await rejectSignature(token, rejectReason.trim());
      setRejected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر إرسال الرفض');
    } finally {
      setRejecting(false);
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

  if (session.otp_required) {
    return <SigningIdentityGate token={token ?? ''} party={session.party} onVerified={load} />;
  }

  if (session.waiting_for_turn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper p-4" dir="rtl">
        <div className="max-w-sm rounded-2xl bg-card p-8 text-center shadow-xl">
          <Clock size={40} className="mx-auto mb-3 text-seal" />
          <h2 className="mb-2 font-display text-lg font-bold text-ink">بانتظار توقيع الطرف الآخر</h2>
          <p className="text-sm text-slate">
            مرحبًا {session.party.full_name || session.party.role_label}، لن يظهر لك المستند إلا بعد توقيع الطرف الذي يسبقك في الترتيب. حاول فتح
            الرابط مرة أخرى لاحقًا.
          </p>
        </div>
      </div>
    );
  }

  if (rejected || session.party.status === 'rejected') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper p-4" dir="rtl">
        <div className="max-w-sm rounded-2xl bg-card p-8 text-center shadow-xl">
          <XCircle size={40} className="mx-auto mb-3 text-clay" />
          <h2 className="mb-2 font-display text-lg font-bold text-ink">تم تسجيل رفضك للعقد</h2>
          <p className="text-sm text-slate">أُبلغ منشئ العقد بقرارك.</p>
        </div>
      </div>
    );
  }

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
        {/* أطراف هذا المستند وعددهم يظهران لكل طرف موقِّع، لا للمنشئ فقط، بصرف
            النظر عن مصدر العقد (محرر أو PDF). */}
        {session.all_parties && session.all_parties.length > 0 && (
          <div className="rounded-xl border border-line bg-card p-4">
            <p className="mb-2 text-xs font-bold text-slate">أطراف هذا المستند ({session.all_parties.length})</p>
            <div className="flex flex-wrap gap-2">
              {session.all_parties.map((p) => (
                <span key={p.id} className="rounded-full bg-paper px-3 py-1 text-xs font-bold text-ink">
                  {p.full_name || 'غير محدد'} — {p.role_label}
                </span>
              ))}
            </div>
          </div>
        )}

        {session.contract.source_type === 'editor' && Boolean(session.contract.body_json) && session.all_parties && (
          <div className="rounded-xl border border-line bg-card p-6">
            {/* بيضاء دائمًا: محتوى العقد الرسمي نصّه أسود ثابت عبر .prose (انظر
                index.css)، بصرف النظر عن وضع الموقع لدى الطرف الموقِّع. النقر على
                أي حقل تعبئة داخل المعاينة (مُعلَّم بـdata-anchor-id) يمرِّر
                ويُركِّز مباشرةً على مدخله المقابل في لوحة التعبئة أسفل الصفحة،
                لربط موضع الحقل داخل النص بمكان تعبئته. */}
            <div
              className="prose max-w-none rounded-lg bg-white p-4 text-sm text-ink"
              onClick={(e) => {
                const target = (e.target as HTMLElement).closest('[data-anchor-id]');
                const anchorId = target?.getAttribute('data-anchor-id');
                if (!anchorId) return;
                const row = document.getElementById(`field-${anchorId}`);
                if (!row) return;
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                row.querySelector<HTMLElement>('input, textarea, select, button')?.focus();
              }}
              dangerouslySetInnerHTML={{
                __html:
                  renderPartiesHeaderHtml(session.all_parties) +
                  renderContractHtml(session.contract.body_json as JsonNode, session.all_parties, liveFillValues),
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
                          <FieldInput
                            field={f}
                            value={values[f.id]}
                            onChange={(v) => setValues((prev) => ({ ...prev, [f.id]: v }))}
                            token={token ?? ''}
                            hasSavedSignature={session.party.has_saved_signature}
                            signatureMethod={signatureMethod}
                            onChooseSignatureMethod={setSignatureMethod}
                            savedSignatureDataUrl={savedSignatureDataUrl}
                            onSavedSignatureVerified={setSavedSignatureDataUrl}
                          />
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
            {session.fields.map((f) => {
              const FieldIcon = FIELD_TYPE_ICONS[f.field_type] ?? FIELD_TYPE_ICONS.text;
              return (
              <div key={f.id} id={f.anchor_id ? `field-${f.anchor_id}` : undefined}>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate">
                  <FieldIcon size={13} className="shrink-0 text-sealMuted" aria-hidden="true" />
                  {f.label} {f.required && <span className="text-clay">*</span>}
                  <span className="rounded-full bg-paper px-1.5 py-0.5 text-[10px] font-bold text-sealMuted">
                    {FIELD_TYPE_LABELS[f.field_type]}
                  </span>
                </p>
                <FieldInput
                  field={f}
                  value={values[f.id]}
                  onChange={(v) => setValues((prev) => ({ ...prev, [f.id]: v }))}
                  token={token ?? ''}
                  hasSavedSignature={session.party.has_saved_signature}
                  signatureMethod={signatureMethod}
                  onChooseSignatureMethod={setSignatureMethod}
                  savedSignatureDataUrl={savedSignatureDataUrl}
                  onSavedSignatureVerified={setSavedSignatureDataUrl}
                />
              </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-line bg-card p-5">
          <h4 className="mb-2 font-display text-sm font-bold text-ink">إقرار وتعهد الموقّع</h4>
          <p className="mb-3 text-xs leading-relaxed text-slate">
            بالموافقة أدناه، أُقرّ بأنني الشخص صاحب البيانات الموضحة في هذا الرابط ({session.party.full_name})، وأنني الوحيد
            المخوَّل بالوصول إلى وسيلة التحقق (الجوال/الرابط) المستخدمة لإتمام هذا التوثيق. أتعهد بصحة جميع البيانات
            والمعلومات التي أدخلتها أو أقررتها ضمن هذا المستند، وأتحمّل كامل المسؤولية القانونية المترتبة على ذلك أمام
            الأطراف الأخرى وأمام الجهات ذات العلاقة. كما أُقرّ بأن توقيعي هذا يُعدّ بمثابة توقيع معتبر شرعًا ونظامًا لا
            يقل حجيةً عن التوقيع الخطي، وأنني بذلك لا أملك حق الاعتراض لاحقًا على محتوى هذه المصادقة أو الطعن في صحة
            صدورها عني بعد اكتمال التوثيق، إلا وفق ما تسمح به الأنظمة المرعية في المملكة العربية السعودية. وأُقرّ بأن دور
            منصة "إقرار لخدمات الأعمال" يقتصر على توفير الوسيلة التقنية للتوثيق الإلكتروني والتحقق من الهوية، وأن المنصة
            غير مسؤولة عن مضمون الاتفاق أو العقد نفسه ولا عن أي نزاع أو خلاف قد ينشأ بين الأطراف بشأنه، وتُخلي مسؤوليتها
            عن أي استخدام غير مصرَّح به لوسيلة التحقق الخاصة بي.
          </p>
          <label className="flex items-start gap-2 text-xs font-bold text-ink">
            <input
              type="checkbox"
              checked={agreedToDeclaration}
              onChange={(e) => setAgreedToDeclaration(e.target.checked)}
              className="mt-0.5"
            />
            <span>قرأت الإقرار أعلاه وأوافق عليه، وأتعهد بصحة بياناتي ومسؤوليتي الكاملة عن هذا التوثيق.</span>
          </label>
        </div>

        {error && <p className="text-sm font-bold text-clay">{error}</p>}

        {showRejectForm ? (
          <div className="rounded-xl border border-clay/30 bg-clayLight p-4">
            <label className="mb-1.5 block text-xs font-bold text-clay">سبب الرفض (اختياري)</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="mb-3 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-clay"
            />
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowRejectForm(false)} disabled={rejecting} className="flex-1">
                تراجع
              </Button>
              <Button variant="danger" onClick={reject} disabled={rejecting} className="flex-1">
                {rejecting ? 'جارِ الإرسال...' : 'تأكيد الرفض'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowRejectForm(true)} disabled={submitting} className="flex-1 py-3">
              رفض العقد
            </Button>
            <Button onClick={submit} disabled={submitting || !agreedToDeclaration} className="flex-[2] py-3">
              {submitting ? 'جارِ الإرسال...' : 'الموافقة وإتمام التوثيق'}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
