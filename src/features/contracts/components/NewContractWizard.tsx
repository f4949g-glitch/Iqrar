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
import { saveWizardProgress, loadWizardProgress, type WizardProgressState } from '../lib/wizardProgress';
import { syntheticContractParties, TEMPLATE_PARTY_PREFIX } from '../lib/syntheticParties';
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

export function NewContractWizard() {
  const { profile, loading: sessionLoading } = useSession();
  const isGuest = !sessionLoading && !profile;

  // نُقرأ نية الدخول المحفوظة من الصفحة الرئيسية (نوع الوثيقة، عدد الأطراف، وطريقة
  // التصديق الافتراضية) مرة واحدة فقط عند فتح المعالج، ثم تُمسح من sessionStorage.
  const [pendingIntent] = useState(() => consumePendingContractIntent());
  // مسودة زائر عاد للتو من تسجيل الدخول/إنشاء الحساب لإكمال عقد بدأه دون حساب.
  const [guestDraft] = useState(() => consumeGuestDraft());
  // تقدّم محفوظ من نفس المعالج إن غادره المستخدم لصفحة أخرى وعاد إليه — يُتجاهل
  // إن كان قادمًا من استكمال مسودة زائر أو قالب جاهز (كلاهما نية "بداية جديدة"
  // أوضح من أي تقدّم قديم متروك في sessionStorage).
  const [wizardProgress] = useState<WizardProgressState | null>(() =>
    guestDraft || pendingIntent?.templateId ? null : loadWizardProgress(),
  );
  const [resuming, setResuming] = useState(Boolean(guestDraft));

  const [step, setStep] = useState<Step>(guestDraft ? 'resuming' : (wizardProgress?.step as Step | undefined) ?? 'parties');
  // زر رجوع المتصفح كان يخرج من المعالج بالكامل بدل الرجوع لخطوة سابقة داخله، لأن
  // التنقّل بين الخطوات كان يعتمد على حالة React فقط بلا أي أثر في history. نُسجّل
  // كل خطوة كإدخال منفصل في history (بنفس رابط الصفحة) عبر goToStep بدل setStep
  // المباشر، ونستمع لـ popstate لنعيد الخطوة السابقة محليًا بدل ترك المتصفح يغادر
  // المعالج بالكامل؛ فقط بعد استنفاد خطوات المعالج المسجَّلة يخرج زر الرجوع فعليًا.
  const goToStep = (next: Step) => {
    setStep(next);
    window.history.pushState({ wizardStep: next }, '');
  };
  useEffect(() => {
    window.history.replaceState({ wizardStep: step }, '');
    const onPopState = (e: PopStateEvent) => {
      const s = (e.state as { wizardStep?: Step } | null)?.wizardStep;
      if (s) setStep(s);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [method, setMethod] = useState<'pdf' | 'editor' | null>(guestDraft?.method ?? wizardProgress?.method ?? null);
  const [title, setTitle] = useState(guestDraft?.title ?? wizardProgress?.title ?? pendingIntent?.templateTitle ?? '');
  const [documentType] = useState<DocumentType>(guestDraft?.documentType ?? wizardProgress?.documentType ?? pendingIntent?.documentType ?? 'contract');
  const poaMode = documentType === 'power_of_attorney';
  // مدة توثيق التفويض ثابتة عند 7 أيام ولا تُعرض للاختيار؛ مدة توثيق العقد تبدأ
  // بـ3 أيام افتراضيًا وتبقى قابلة للتعديل زيادةً أو نقصانًا (1-14 يومًا).
  const [durationDays, setDurationDays] = useState(guestDraft?.durationDays ?? wizardProgress?.durationDays ?? (poaMode ? '7' : '3'));
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
  const [companyName, setCompanyName] = useState(guestDraft?.companyName ?? wizardProgress?.companyName ?? '');
  const [companyCrNumber, setCompanyCrNumber] = useState(guestDraft?.companyCrNumber ?? wizardProgress?.companyCrNumber ?? '');
  const [companyLogoDataUrl, setCompanyLogoDataUrl] = useState<string | null>(
    guestDraft?.companyLogoDataUrl ?? wizardProgress?.companyLogoDataUrl ?? null,
  );
  const [termMode, setTermMode] = useState<TermMode>(guestDraft?.termMode ?? wizardProgress?.termMode ?? 'none');
  const [termValue, setTermValue] = useState(guestDraft?.termValue ?? wizardProgress?.termValue ?? '');
  const [termUnit, setTermUnit] = useState<TermUnit>(guestDraft?.termUnit ?? wizardProgress?.termUnit ?? 'month');
  const [termEndDate, setTermEndDate] = useState(guestDraft?.termEndDate ?? wizardProgress?.termEndDate ?? '');
  // إن وصل المستخدم عبر نافذة الصفحة الرئيسية (pendingIntent) فقد اختار طريقة
  // التصديق هناك بالفعل — لا داعي لسؤاله نفس السؤال مجددًا في خطوة بيانات
  // الأطراف؛ null يعني أنه فتح المعالج مباشرة بلا اختيار مسبق فتبقى البطاقتان
  // التفاعليتان معروضتين كسابقًا.
  const verificationPreset = pendingIntent?.verificationDefault ?? null;
  // كود الخصم يُدخَل ويُعايَن مباشرة في خطوة بيانات الأطراف (PartiesStep)، ثم
  // يُطبَّق تلقائيًا على العقد الحقيقي فور توفّره في خطوة المراجعة.
  const [discountCode, setDiscountCode] = useState('');
  const [draftParties, setDraftParties] = useState<DraftParty[]>(() => {
    if (guestDraft) return guestDraft.parties;
    if (wizardProgress) return wizardProgress.draftParties;
    // بدء عقد من قالب جاهز: عدد خانات الأطراف ثابت بعدد القالب (party_count)،
    // وكل خانة تحمل معرّفًا مؤقتًا tmpl-party-N يطابق مراجع الأطراف المضمَّنة في
    // body_json القالب، ليُستبدل بمعرّف حقيقي فور إنشاء الأطراف فعليًا لاحقًا.
    if (pendingIntent?.templateId) {
      return Array.from({ length: pendingIntent.partyCount }, (_, i) => ({
        ...emptyParty(i),
        partyId: `${TEMPLATE_PARTY_PREFIX}${i}`,
        verification_method: pendingIntent.verificationDefault,
      }));
    }
    // العقد والتفويض كلاهما يتطلبان طرفين بالضبط: الطرف الأول صاحب الحساب
    // (الموكِّل في التفويض)، والثاني يُملأ بياناته المُنشئ بالكامل (الموكَّل له).
    if (!pendingIntent) return [emptyParty(0), emptyParty(1)];
    const count = Math.max(pendingIntent.partyCount, 2);
    return Array.from({ length: count }, (_, i) => ({
      ...emptyParty(i),
      verification_method: pendingIntent.verificationDefault,
      role_label:
        pendingIntent.documentType === 'power_of_attorney' ? (i === 0 ? 'الموكِّل' : 'الموكَّل له') : emptyParty(i).role_label,
    }));
  });
  // الطرف الأول يمثّل صاحب الحساب نفسه (الموكِّل/مُصدِر التفويض في حالة
  // التفويض)، فتُملأ بياناته الشخصية تلقائيًا من الحساب فور توفّرها ويكون هو
  // من يستلم رابط التوقيع أولًا. الطرف الثاني (الموكَّل له في التفويض) يُملأ
  // المُنشئ بياناته بالكامل يدويًا في PartiesStep. مرة واحدة فقط كي لا تُطمَس
  // تعديلات لاحقة على الجوال/البريد، والاسم/الهوية/الجنسية مقفلة أصلًا في
  // PartiesStep فلا تُعدَّل يدويًا.
  const profileAppliedToPartyOneRef = useRef(false);
  useEffect(() => {
    if (!profile || profileAppliedToPartyOneRef.current) return;
    profileAppliedToPartyOneRef.current = true;
    setDraftParties((prev) => {
      if (prev.length === 0) return prev;
      return prev.map((p, i) =>
        i === 0
          ? {
              ...p,
              is_self: true,
              full_name: profile.full_name || p.full_name,
              national_id: profile.national_id || p.national_id,
              nationality: profile.nationality || p.nationality,
              phone: profile.phone || p.phone,
              email: profile.email || p.email,
            }
          : p,
      );
    });
  }, [profile]);
  const [contract, setContract] = useState<Contract | null>(guestDraft ? null : wizardProgress?.contract ?? null);
  const [parties, setParties] = useState<ContractParty[]>(guestDraft ? [] : wizardProgress?.parties ?? []);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(guestDraft ? 0 : wizardProgress?.pageCount ?? 0);
  const [pdfUrl, setPdfUrl] = useState(guestDraft ? '' : wizardProgress?.pdfUrl ?? '');
  const [body, setBody] = useState<JSONContent | null>(guestDraft?.body ?? wizardProgress?.body ?? pendingIntent?.templateBody ?? null);
  const [fields, setFields] = useState<ContractField[]>(guestDraft ? [] : wizardProgress?.fields ?? []);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const syncInFlightRef = useRef(false);

  // حفظ مستمر لتقدّم المعالج كي لا يُفقَد إن غادر المستخدم لصفحة أخرى (مثل الملف
  // الشخصي) ثم عاد؛ يُتجاهل أثناء شاشتي الاستكمال/تسجيل الدخول (لا تقدّم حقيقي
  // بعد)، ويُمسَح صراحةً في ReviewStep بعد إرسال العقد بنجاح.
  useEffect(() => {
    if (step === 'resuming' || step === 'authGate') return;
    saveWizardProgress({
      step: step as WizardProgressState['step'],
      method,
      documentType,
      title,
      durationDays,
      companyName,
      companyCrNumber,
      companyLogoDataUrl,
      termMode,
      termValue,
      termUnit,
      termEndDate,
      draftParties,
      body,
      contract,
      parties,
      pdfUrl,
      pageCount,
      fields,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    step,
    method,
    documentType,
    title,
    durationDays,
    companyName,
    companyCrNumber,
    companyLogoDataUrl,
    termMode,
    termValue,
    termUnit,
    termEndDate,
    draftParties,
    body,
    contract,
    parties,
    pdfUrl,
    pageCount,
    fields,
  ]);

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
      sequential_signing: pendingIntent?.templateSequentialSigning ?? false,
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
      // معرّف الطرف المؤقت الذي وُلِّد أثناء تأليف زائر لمحتوى العقد (guest-temp-*) أو
      // عند بدء عقد من قالب جاهز (tmpl-party-*) ليس صفًا حقيقيًا في القاعدة بعد،
      // فيجب إنشاؤه لا تحديثه.
      const isRealPartyId =
        Boolean(p.partyId) && !p.partyId!.startsWith('guest-temp-') && !p.partyId!.startsWith(TEMPLATE_PARTY_PREFIX);
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

  // يستبدل معرّفات الأطراف المؤقتة (guest-temp-*/tmpl-party-*) داخل محتوى مؤلَّف
  // مسبقًا (زائر كتب المحتوى قبل تسجيل الدخول، أو قالب جاهز) بمعرّفات الأطراف
  // الحقيقية فور إنشائها فعليًا، ثم يُنشئ حقول العقد من المحتوى المُستبدَل.
  const finalizeTemplateContent = async (contractId: string, currentBody: JSONContent, createdParties: ContractParty[]) => {
    const idMap: Record<string, string> = {};
    draftParties.forEach((p, i) => {
      if (p.partyId) idMap[p.partyId] = createdParties[i].id;
    });
    const remapped = remapPartyIds(currentBody, idMap);
    const createdFields = await createFieldsFromScratch(contractId, remapped, createdParties);
    setBody(remapped);
    setFields(createdFields);
  };

  // استكمال مسودة زائر بعد تسجيل الدخول: يُنشئ العقد والأطراف فعليًا، ثم إن كان
  // قد ألّف محتوى العقد بالمحرر يُنشئ حقوله أيضًا (بعد استبدال معرّفات الأطراف
  // المؤقتة بمعرّفاتها الحقيقية)، ثم ينتقل مباشرة إلى خطوة المراجعة والدفع.
  useEffect(() => {
    if (!guestDraft || sessionLoading || !resuming) return;
    if (!profile) {
      persistGuestDraft(guestDraft.resumeStep, guestDraft.method);
      goToStep('authGate');
      setResuming(false);
      return;
    }
    // نفس الحارس المتزامن المستخدَم في selectMethod، كي لا يُنشئ استدعاء ثانٍ لهذا
    // المسار (مثلًا إعادة تشغيل الأثر بسبب تغيّر sessionLoading أثناء التنفيذ) أطرافًا
    // مكرَّرة بالتوازي مع الاستدعاء الأول.
    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    (async () => {
      setBusy(true);
      setError('');
      try {
        const { contract: created, parties: createdParties } = await syncToBackend(guestDraft.method);
        if (guestDraft.method === 'editor' && body) {
          await finalizeTemplateContent(created.id, body, createdParties);
          goToStep('review');
        } else {
          goToStep('upload');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'تعذّر استكمال العملية بعد تسجيل الدخول');
        goToStep('authGate');
      } finally {
        setBusy(false);
        setResuming(false);
        syncInFlightRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, sessionLoading, resuming]);

  const goToMethod = () => {
    // القالب الجاهز يعني ضمنيًا "محرر نصوص" (محتواه مكتوب بالفعل)، فلا داعي
    // لعرض خطوة اختيار طريقة الإنشاء — ننتقل مباشرة لخطوة المحرر.
    if (pendingIntent?.templateId) {
      selectMethod('editor');
      return;
    }
    if (isGuest) {
      // نمنح كل طرف معرّفًا مؤقتًا ليُستخدم في حقول الدمج/التعبئة أثناء تأليف
      // المحتوى، ويُستبدل بمعرّف حقيقي بعد إنشاء الأطراف فعليًا لاحقًا.
      setDraftParties((prev) => prev.map((p) => (p.partyId ? p : { ...p, partyId: `guest-temp-${crypto.randomUUID()}` })));
    }
    goToStep('method');
  };

  const selectMethod = async (chosen: 'pdf' | 'editor') => {
    setMethod(chosen);
    setError('');

    if (isGuest) {
      if (chosen === 'pdf') {
        // رفع ملف PDF يتطلب تخزينه في القاعدة فورًا، لذا نطلب تسجيل الدخول الآن
        // بدل الانتظار حتى المراجعة كما في مسار كتابة المحتوى بالمحرر.
        persistGuestDraft('upload', chosen);
        goToStep('authGate');
      } else {
        goToStep('editor');
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
      const { contract: created, parties: createdParties } = await syncToBackend(chosen);
      // مستخدم مسجَّل دخوله يبدأ عقدًا من قالب جاهز مباشرة (بلا مرور بمسار
      // الزائر/الاستكمال): يجب استبدال معرّفات الأطراف المؤقتة في body قبل عرض
      // خطوة المحرر، وإلا يُثبَّت المحرر على المحتوى القديم عند أول عرض له.
      if (chosen === 'editor' && pendingIntent?.templateId && body) {
        await finalizeTemplateContent(created.id, body, createdParties);
      }
      goToStep(chosen === 'editor' ? 'editor' : 'upload');
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
      goToStep('authGate');
      return;
    }
    goToStep('review');
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
      goToStep('fields');
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
            <Link to="/login?return=/app/contracts/new" className="rounded-full bg-card px-6 py-2.5 text-sm font-bold text-ink shadow-sm hover:bg-paper">
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
          profile={profile}
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
          verificationPreset={verificationPreset}
          discountCode={discountCode}
          onDiscountCodeChange={setDiscountCode}
          partyCountLocked={Boolean(pendingIntent?.templateId)}
          onNext={goToMethod}
        />
      )}

      {step === 'method' && <MethodStep documentType={documentType} onSelect={selectMethod} onBack={() => goToStep('parties')} busy={busy} />}

      {step === 'upload' && contract && (
        <UploadStep
          file={file}
          onFileChange={(f, pages) => {
            setFile(f);
            setPageCount(pages);
          }}
          onBack={() => goToStep('method')}
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
          onBack={() => goToStep('upload')}
          onNext={() => goToStep('review')}
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
          onBack={() => goToStep('method')}
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
          profile={profile}
          initialDiscountCode={discountCode}
          onBack={() => goToStep(method === 'editor' ? 'editor' : 'fields')}
        />
      )}

      {busy && <p className="mt-4 text-sm text-slate">جارِ المعالجة...</p>}
    </div>
  );
}
