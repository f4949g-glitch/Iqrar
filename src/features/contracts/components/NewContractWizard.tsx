import { useEffect, useRef, useState } from 'react';
import type { JSONContent } from '@tiptap/react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useSession } from '@/features/auth/hooks/useSession';
import { PartiesStep, emptyParty, type DraftParty, type TermMode } from './wizard/PartiesStep';
import { MethodStep } from './wizard/MethodStep';
import { UploadStep } from './wizard/UploadStep';
import { FieldsStep } from './wizard/FieldsStep';
import { EditorStep } from './wizard/EditorStep';
import { ReviewStep } from './wizard/ReviewStep';
import {
  addParty,
  createDraftContract,
  getOriginalPdfUrl,
  updateContractMeta,
  updateParty,
  uploadCompanyLogo,
  uploadOriginalPdf,
} from '../api/contractsApi';
import { createFieldsFromScratch } from '../lib/syncEditorContent';
import { consumePendingContractIntent } from '../lib/pendingIntent';
import { saveGuestDraft, consumeGuestDraft, type GuestResumeStep } from '../lib/guestDraft';
import { remapPartyIds } from '../editor/remapPartyIds';
import {
  DOCUMENT_TYPE_DEFINITE_LABELS,
  DOCUMENT_TYPE_LABELS,
  type Contract,
  type ContractField,
  type ContractParty,
  type DocumentType,
  type TermUnit,
} from '../types';

type Step = 'parties' | 'method' | 'upload' | 'fields' | 'editor' | 'review' | 'authGate' | 'resuming';

const STEP_ORDER_PDF: Step[] = ['parties', 'method', 'upload', 'fields', 'review'];
const STEP_ORDER_EDITOR: Step[] = ['parties', 'method', 'editor', 'review'];

// يبني قائمة أطراف "شكلية" لاستخدامها داخل محرر النصوص أثناء كتابة زائر (بلا
// حساب بعد) لمحتوى العقد، كي تعمل حقول الدمج والتعبئة بمعرّفات مؤقتة تُستبدل
// بمعرّفات حقيقية بعد إنشاء الأطراف فعليًا في القاعدة (انظر remapPartyIds).
function syntheticContractParties(draftParties: DraftParty[]): ContractParty[] {
  return draftParties.map((p, i) => ({
    id: p.partyId ?? `guest-temp-${i}`,
    contract_id: '',
    role_label: p.role_label === 'أخرى' ? p.custom_role.trim() || 'طرف' : p.role_label,
    full_name: p.full_name || null,
    national_id: p.national_id || null,
    email: p.email || null,
    phone: p.phone || null,
    token: '',
    status: 'pending',
    order_index: i,
    user_id: null,
    signed_at: null,
    created_at: '',
    verification_method: p.verification_method,
    date_of_birth: p.date_of_birth || null,
    nafath_trans_id: null,
    nafath_random_code: null,
    nafath_status: null,
    nafath_verified_at: null,
    party_type: p.party_type,
    entity_name: p.entity_name || null,
    entity_cr_number: p.entity_cr_number || null,
    nationality: p.nationality || null,
    address: p.address || null,
    reject_resend_count: 0,
    signed_ip: null,
    signed_user_agent: null,
  }));
}

export function NewContractWizard() {
  const { profile, loading: sessionLoading } = useSession();
  const isGuest = !sessionLoading && !profile;

  // نُقرأ نية الدخول المحفوظة من الصفحة الرئيسية (نوع الوثيقة، عدد الأطراف، وطريقة
  // التصديق الافتراضية) مرة واحدة فقط عند فتح المعالج، ثم تُمسح من sessionStorage.
  const [pendingIntent] = useState(() => consumePendingContractIntent());
  // مسودة زائر عاد للتو من تسجيل الدخول/إنشاء الحساب لإكمال عقد بدأه دون حساب.
  const [guestDraft] = useState(() => consumeGuestDraft());
  const [resuming, setResuming] = useState(Boolean(guestDraft));

  const [step, setStep] = useState<Step>(guestDraft ? 'resuming' : 'parties');
  const [method, setMethod] = useState<'pdf' | 'editor' | null>(guestDraft?.method ?? null);
  const [title, setTitle] = useState(guestDraft?.title ?? '');
  const [documentType] = useState<DocumentType>(guestDraft?.documentType ?? pendingIntent?.documentType ?? 'contract');
  const poaMode = documentType === 'power_of_attorney';
  // مدة توثيق التفويض ثابتة عند 7 أيام ولا تُعرض للاختيار؛ مدة توثيق العقد تبدأ
  // بـ3 أيام افتراضيًا وتبقى قابلة للتعديل زيادةً أو نقصانًا (1-14 يومًا).
  const [durationDays, setDurationDays] = useState(guestDraft?.durationDays ?? (poaMode ? '7' : '3'));
  const docLabel = DOCUMENT_TYPE_DEFINITE_LABELS[documentType];
  const stepLabels: Record<Step, string> = {
    parties: 'بيانات الأطراف',
    method: 'طريقة الإنشاء',
    upload: 'رفع المستند',
    fields: 'الحقول',
    editor: `محتوى ${docLabel}`,
    review: 'المراجعة والإرسال',
    authGate: 'تسجيل الدخول',
    resuming: 'استكمال',
  };
  const [companyName, setCompanyName] = useState(guestDraft?.companyName ?? '');
  const [companyCrNumber, setCompanyCrNumber] = useState(guestDraft?.companyCrNumber ?? '');
  const [companyLogoDataUrl, setCompanyLogoDataUrl] = useState<string | null>(guestDraft?.companyLogoDataUrl ?? null);
  const [termMode, setTermMode] = useState<TermMode>(guestDraft?.termMode ?? 'none');
  const [termValue, setTermValue] = useState(guestDraft?.termValue ?? '');
  const [termUnit, setTermUnit] = useState<TermUnit>(guestDraft?.termUnit ?? 'month');
  const [termEndDate, setTermEndDate] = useState(guestDraft?.termEndDate ?? '');
  const [draftParties, setDraftParties] = useState<DraftParty[]>(() => {
    if (guestDraft) return guestDraft.parties;
    // العقد يتطلب طرفين على الأقل (تفويض هو الاستثناء الوحيد بطرف واحد)، فتُهيَّأ
    // خانتان افتراضيًا بدل واحدة كي لا يفاجَأ المستخدم بخطأ التحقق لاحقًا.
    if (!pendingIntent) return poaMode ? [emptyParty()] : [emptyParty(), emptyParty()];
    const count = pendingIntent.documentType === 'power_of_attorney' ? 1 : Math.max(pendingIntent.partyCount, 2);
    return Array.from({ length: count }, () => ({
      ...emptyParty(),
      verification_method: pendingIntent.verificationDefault,
      role_label: pendingIntent.documentType === 'power_of_attorney' ? 'المفوض' : 'الطرف الأول',
    }));
  });
  // الطرف الأول لعقد (لا تفويض) يمثّل صاحب الحساب نفسه، فتُملأ بياناته الشخصية
  // تلقائيًا من الحساب فور توفّرها (مرة واحدة فقط كي لا تُطمَس تعديلات لاحقة على
  // الجوال/البريد، والاسم/الهوية/الجنسية مقفلة أصلًا في PartiesStep فلا تُعدَّل يدويًا).
  const profileAppliedToPartyOneRef = useRef(false);
  useEffect(() => {
    if (poaMode || !profile || profileAppliedToPartyOneRef.current) return;
    profileAppliedToPartyOneRef.current = true;
    setDraftParties((prev) => {
      if (prev.length === 0) return prev;
      return prev.map((p, i) =>
        i === 0
          ? {
              ...p,
              full_name: profile.full_name || p.full_name,
              national_id: profile.national_id || p.national_id,
              nationality: profile.nationality || p.nationality,
              phone: profile.phone || p.phone,
              email: profile.email || p.email,
            }
          : p,
      );
    });
  }, [poaMode, profile]);
  const [contract, setContract] = useState<Contract | null>(null);
  const [parties, setParties] = useState<ContractParty[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pdfUrl, setPdfUrl] = useState('');
  const [body, setBody] = useState<JSONContent | null>(guestDraft?.body ?? null);
  const [fields, setFields] = useState<ContractField[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const syncInFlightRef = useRef(false);

  const persistGuestDraft = (resumeStep: GuestResumeStep, chosenMethod: 'pdf' | 'editor') => {
    saveGuestDraft({
      documentType,
      method: chosenMethod,
      resumeStep,
      title,
      durationDays,
      companyName,
      companyCrNumber,
      companyLogoDataUrl,
      termMode,
      termValue,
      termUnit,
      termEndDate,
      parties: draftParties,
      body,
    });
  };

  const ensureContract = async (): Promise<Contract> => {
    if (contract) return contract;
    const created = await createDraftContract(title.trim() || `${DOCUMENT_TYPE_LABELS[documentType]} جديد`, durationDays ? Number(durationDays) : null);
    setContract(created);
    return created;
  };

  // يُنشئ العقد وأطرافه فعليًا في القاعدة (لمستخدم مسجَّل دخوله فقط)، ويُستخدم في
  // مسارين: الاختيار المباشر لطريقة الإنشاء، واستكمال مسودة زائر بعد تسجيل دخوله.
  const syncToBackend = async (chosen: 'pdf' | 'editor'): Promise<{ contract: Contract; parties: ContractParty[] }> => {
    const base = await ensureContract();
    let created = await updateContractMeta(base.id, {
      title: title.trim(),
      duration_days: durationDays ? Number(durationDays) : null,
      source_type: chosen,
      document_type: documentType,
      company_name: companyName.trim() || null,
      company_cr_number: companyCrNumber.trim() || null,
      term_value: termMode === 'duration' && termValue ? Number(termValue) : null,
      term_unit: termMode === 'duration' && termValue ? termUnit : null,
      term_end_date: termMode === 'date' && termEndDate ? termEndDate : null,
    });
    // شعار المنشأة اختياري: يُرفَع لتخزين الملفات بعد إنشاء العقد فعليًا (له معرّف
    // حقيقي)، ويُدرَج بارزًا في كل صفحات المستند النهائي عند التوليد.
    if (companyLogoDataUrl) {
      created = await uploadCompanyLogo(created.id, companyLogoDataUrl);
    }
    const createdParties: ContractParty[] = [];
    const newPartyIds: Record<number, string> = {};
    for (let i = 0; i < draftParties.length; i++) {
      const p = draftParties[i];
      const role = p.role_label === 'أخرى' ? p.custom_role.trim() : p.role_label;
      const payload = {
        role_label: role,
        full_name: p.full_name.trim() || undefined,
        national_id: p.national_id.trim() || undefined,
        nationality: p.nationality.trim() || undefined,
        address: p.address.trim() || undefined,
        email: p.email.trim() || undefined,
        phone: p.phone.trim() || undefined,
        order_index: i,
        verification_method: p.verification_method,
        date_of_birth: p.date_of_birth || undefined,
        party_type: p.party_type,
        entity_name: p.party_type === 'entity' ? p.entity_name.trim() || undefined : undefined,
        entity_cr_number: p.party_type === 'entity' ? p.entity_cr_number.trim() || undefined : undefined,
      };
      // معرّف الطرف المؤقت الذي وُلِّد أثناء تأليف زائر لمحتوى العقد ليس صفًا حقيقيًا
      // في القاعدة بعد، فيجب إنشاؤه لا تحديثه.
      const isRealPartyId = Boolean(p.partyId) && !p.partyId!.startsWith('guest-temp-');
      const party = isRealPartyId ? await updateParty(p.partyId!, payload) : await addParty(created.id, payload);
      createdParties.push(party);
      if (!isRealPartyId) newPartyIds[i] = party.id;
    }
    setContract(created);
    setParties(createdParties);
    // نُثبِّت معرّفات الأطراف الحقيقية المُنشأة للتو داخل draftParties، حتى لو
    // استُدعيت syncToBackend مرة أخرى لاحقًا (نقر مزدوج على زر طريقة الإنشاء، أو
    // تنقّل للخلف ثم إعادة اختيارها) فلا تُنشأ صفوف أطراف مكرَّرة بنفس البيانات.
    if (Object.keys(newPartyIds).length > 0) {
      setDraftParties((prev) => prev.map((dp, i) => (newPartyIds[i] ? { ...dp, partyId: newPartyIds[i] } : dp)));
    }
    return { contract: created, parties: createdParties };
  };

  // استكمال مسودة زائر بعد تسجيل الدخول: يُنشئ العقد والأطراف فعليًا، ثم إن كان
  // قد ألّف محتوى العقد بالمحرر يُنشئ حقوله أيضًا (بعد استبدال معرّفات الأطراف
  // المؤقتة بمعرّفاتها الحقيقية)، ثم ينتقل مباشرة إلى خطوة المراجعة والدفع.
  useEffect(() => {
    if (!guestDraft || sessionLoading || !resuming) return;
    if (!profile) {
      persistGuestDraft(guestDraft.resumeStep, guestDraft.method);
      setStep('authGate');
      setResuming(false);
      return;
    }
    (async () => {
      setBusy(true);
      setError('');
      try {
        const { contract: created, parties: createdParties } = await syncToBackend(guestDraft.method);
        if (guestDraft.method === 'editor' && body) {
          const idMap: Record<string, string> = {};
          draftParties.forEach((p, i) => {
            if (p.partyId) idMap[p.partyId] = createdParties[i].id;
          });
          const remapped = remapPartyIds(body, idMap);
          const createdFields = await createFieldsFromScratch(created.id, remapped, createdParties);
          setBody(remapped);
          setFields(createdFields);
          setStep('review');
        } else {
          setStep('upload');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'تعذّر استكمال العملية بعد تسجيل الدخول');
        setStep('authGate');
      } finally {
        setBusy(false);
        setResuming(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, sessionLoading, resuming]);

  const goToMethod = () => {
    if (isGuest) {
      // نمنح كل طرف معرّفًا مؤقتًا ليُستخدم في حقول الدمج/التعبئة أثناء تأليف
      // المحتوى، ويُستبدل بمعرّف حقيقي بعد إنشاء الأطراف فعليًا لاحقًا.
      setDraftParties((prev) => prev.map((p) => (p.partyId ? p : { ...p, partyId: `guest-temp-${crypto.randomUUID()}` })));
    }
    setStep('method');
  };

  const selectMethod = async (chosen: 'pdf' | 'editor') => {
    setMethod(chosen);
    setError('');

    if (isGuest) {
      if (chosen === 'pdf') {
        // رفع ملف PDF يتطلب تخزينه في القاعدة فورًا، لذا نطلب تسجيل الدخول الآن
        // بدل الانتظار حتى المراجعة كما في مسار كتابة المحتوى بالمحرر.
        persistGuestDraft('upload', chosen);
        setStep('authGate');
      } else {
        setStep('editor');
      }
      return;
    }

    // حارس صريح إضافةً لتعطيل الزرّين في MethodStep: حالة busy تتحدّث عبر React
    // state (غير متزامنة)، فقد تفلت نقرة ثانية قبل أن يُعاد الرسم فعليًا وتُنشئ
    // طرفًا مكررًا في القاعدة — هذا المرجع يمنع الدخول المتزامن بغضّ النظر عن التوقيت.
    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    setBusy(true);
    try {
      await syncToBackend(chosen);
      setStep(chosen === 'editor' ? 'editor' : 'upload');
    } catch (err) {
      setError(err instanceof Error ? err.message : `تعذّر إنشاء ${docLabel}`);
    } finally {
      setBusy(false);
      syncInFlightRef.current = false;
    }
  };

  const finishEditor = () => {
    if (isGuest) {
      persistGuestDraft('review', 'editor');
      setStep('authGate');
      return;
    }
    setStep('review');
  };

  const goToFields = async () => {
    if (!contract || !file) return;
    setBusy(true);
    setError('');
    try {
      const updated = await uploadOriginalPdf(contract.id, file, pageCount);
      setContract(updated);
      const url = await getOriginalPdfUrl(updated.original_file_path!);
      setPdfUrl(url);
      setStep('fields');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر رفع الملف');
    } finally {
      setBusy(false);
    }
  };

  const stepOrder = method === 'editor' ? STEP_ORDER_EDITOR : STEP_ORDER_PDF;
  const stepIndex = stepOrder.indexOf(step);
  const editorParties = contract ? parties : syntheticContractParties(draftParties);

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-ink">{DOCUMENT_TYPE_LABELS[documentType]} جديد</h1>

      <div className="mb-8 flex items-center gap-2">
        {stepOrder.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                i <= stepIndex ? 'bg-seal text-white' : 'bg-line text-slate'
              }`}
            >
              {i + 1}
            </div>
            <span className={`hidden text-xs font-bold sm:inline ${i <= stepIndex ? 'text-ink' : 'text-slate'}`}>
              {stepLabels[s]}
            </span>
            {i < stepOrder.length - 1 && <div className="h-px flex-1 bg-line" />}
          </div>
        ))}
      </div>

      {error && <p className="mb-4 text-sm font-bold text-clay">{error}</p>}

      {step === 'resuming' && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-card p-10 text-center">
          <p className="text-sm font-bold text-ink">جارِ استكمال {docLabel}...</p>
          <p className="text-xs text-slate">يرجى الانتظار قليلًا</p>
        </div>
      )}

      {step === 'authGate' && (
        <div className="flex flex-col items-center rounded-2xl border border-line bg-card p-10 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sealLight">
            <Lock size={24} className="text-seal" />
          </div>
          <h2 className="mb-2 font-display text-lg font-bold text-ink">سجّل الدخول لإكمال {docLabel}</h2>
          <p className="mb-6 max-w-sm text-sm text-slate">
            تم حفظ كل ما أدخلته على هذا الجهاز، سجّل الدخول أو أنشئ حسابًا برقم هويتك خلال دقيقة لإكمال{' '}
            {method === 'pdf' ? 'رفع المستند و' : ''}المراجعة والدفع.
          </p>
          <div className="flex gap-3">
            <Link to="/login?return=/app/contracts/new" className="rounded-full bg-white px-6 py-2.5 text-sm font-bold text-ink shadow-sm hover:bg-paper">
              تسجيل الدخول
            </Link>
            <Link to="/register?return=/app/contracts/new" className="rounded-full bg-seal px-6 py-2.5 text-sm font-bold text-white hover:opacity-90">
              إنشاء حساب
            </Link>
          </div>
        </div>
      )}

      {step === 'parties' && (
        <PartiesStep
          title={title}
          onTitleChange={setTitle}
          durationDays={durationDays}
          onDurationChange={setDurationDays}
          documentType={documentType}
          poaMode={poaMode}
          isGuest={isGuest}
          companyName={companyName}
          onCompanyNameChange={setCompanyName}
          companyCrNumber={companyCrNumber}
          onCompanyCrNumberChange={setCompanyCrNumber}
          companyLogoDataUrl={companyLogoDataUrl}
          onCompanyLogoChange={setCompanyLogoDataUrl}
          termMode={termMode}
          onTermModeChange={setTermMode}
          termValue={termValue}
          onTermValueChange={setTermValue}
          termUnit={termUnit}
          onTermUnitChange={setTermUnit}
          termEndDate={termEndDate}
          onTermEndDateChange={setTermEndDate}
          parties={draftParties}
          onPartiesChange={setDraftParties}
          ensureContract={ensureContract}
          onNext={goToMethod}
        />
      )}

      {step === 'method' && <MethodStep documentType={documentType} onSelect={selectMethod} onBack={() => setStep('parties')} busy={busy} />}

      {step === 'upload' && contract && (
        <UploadStep
          file={file}
          onFileChange={(f, pages) => {
            setFile(f);
            setPageCount(pages);
          }}
          onBack={() => setStep('method')}
          onNext={goToFields}
        />
      )}

      {step === 'fields' && contract && (
        <FieldsStep
          contractId={contract.id}
          pdfUrl={pdfUrl}
          pageCount={pageCount}
          parties={parties}
          fields={fields}
          onFieldsChange={setFields}
          onBack={() => setStep('upload')}
          onNext={() => setStep('review')}
        />
      )}

      {step === 'editor' && (
        <EditorStep
          contractId={contract?.id ?? null}
          documentType={documentType}
          parties={editorParties}
          body={body}
          onBodyChange={setBody}
          fields={fields}
          onFieldsChange={setFields}
          onBack={() => setStep('method')}
          onNext={finishEditor}
        />
      )}

      {step === 'review' && contract && (
        <ReviewStep
          contract={contract}
          parties={parties}
          fields={fields}
          body={body}
          pdfUrl={pdfUrl}
          companyLogoDataUrl={companyLogoDataUrl}
          onBack={() => setStep(method === 'editor' ? 'editor' : 'fields')}
        />
      )}

      {busy && <p className="mt-4 text-sm text-slate">جارِ المعالجة...</p>}
    </div>
  );
}
