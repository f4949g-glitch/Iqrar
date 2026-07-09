import { useState } from 'react';
import type { JSONContent } from '@tiptap/react';
import { PartiesStep, emptyParty, type DraftParty } from './wizard/PartiesStep';
import { MethodStep } from './wizard/MethodStep';
import { UploadStep } from './wizard/UploadStep';
import { FieldsStep } from './wizard/FieldsStep';
import { EditorStep } from './wizard/EditorStep';
import { ReviewStep } from './wizard/ReviewStep';
import { addParty, createDraftContract, getOriginalPdfUrl, updateContractMeta, updateParty, uploadOriginalPdf } from '../api/contractsApi';
import { setContractDiscountCode } from '../api/discountCodesApi';
import type { Contract, ContractField, ContractParty } from '../types';

type Step = 'parties' | 'method' | 'upload' | 'fields' | 'editor' | 'review';

const STEP_ORDER_PDF: Step[] = ['parties', 'method', 'upload', 'fields', 'review'];
const STEP_ORDER_EDITOR: Step[] = ['parties', 'method', 'editor', 'review'];
const STEP_LABELS: Record<Step, string> = {
  parties: 'بيانات الأطراف',
  method: 'طريقة الإنشاء',
  upload: 'رفع المستند',
  fields: 'الحقول',
  editor: 'محتوى العقد',
  review: 'المراجعة والإرسال',
};

export function NewContractWizard() {
  const [step, setStep] = useState<Step>('parties');
  const [method, setMethod] = useState<'pdf' | 'editor' | null>(null);
  const [title, setTitle] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyCrNumber, setCompanyCrNumber] = useState('');
  const [draftParties, setDraftParties] = useState<DraftParty[]>([emptyParty()]);
  const [pendingDiscountCode, setPendingDiscountCode] = useState<string | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [parties, setParties] = useState<ContractParty[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pdfUrl, setPdfUrl] = useState('');
  const [body, setBody] = useState<JSONContent | null>(null);
  const [fields, setFields] = useState<ContractField[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const ensureContract = async (): Promise<Contract> => {
    if (contract) return contract;
    const created = await createDraftContract(title.trim() || 'عقد جديد', durationDays ? Number(durationDays) : null);
    setContract(created);
    return created;
  };

  const goToMethod = (validDiscountCode: string | null) => {
    setPendingDiscountCode(validDiscountCode);
    setStep('method');
  };

  const selectMethod = async (chosen: 'pdf' | 'editor') => {
    setMethod(chosen);
    setBusy(true);
    setError('');
    try {
      const base = await ensureContract();
      const created = await updateContractMeta(base.id, {
        title: title.trim(),
        duration_days: durationDays ? Number(durationDays) : null,
        source_type: chosen,
        company_name: companyName.trim() || null,
        company_cr_number: companyCrNumber.trim() || null,
      });
      if (pendingDiscountCode) {
        await setContractDiscountCode(created.id, pendingDiscountCode);
      }
      const createdParties: ContractParty[] = [];
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
        const party = p.partyId ? await updateParty(p.partyId, payload) : await addParty(created.id, payload);
        createdParties.push(party);
      }
      setContract(created);
      setParties(createdParties);
      setStep(chosen === 'editor' ? 'editor' : 'upload');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر إنشاء العقد');
    } finally {
      setBusy(false);
    }
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

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-ink">عقد جديد</h1>

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
              {STEP_LABELS[s]}
            </span>
            {i < stepOrder.length - 1 && <div className="h-px flex-1 bg-line" />}
          </div>
        ))}
      </div>

      {error && <p className="mb-4 text-sm font-bold text-clay">{error}</p>}

      {step === 'parties' && (
        <PartiesStep
          title={title}
          onTitleChange={setTitle}
          durationDays={durationDays}
          onDurationChange={setDurationDays}
          companyName={companyName}
          onCompanyNameChange={setCompanyName}
          companyCrNumber={companyCrNumber}
          onCompanyCrNumberChange={setCompanyCrNumber}
          parties={draftParties}
          onPartiesChange={setDraftParties}
          ensureContract={ensureContract}
          onNext={goToMethod}
        />
      )}

      {step === 'method' && <MethodStep onSelect={selectMethod} onBack={() => setStep('parties')} />}

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

      {step === 'editor' && contract && (
        <EditorStep
          contractId={contract.id}
          parties={parties}
          body={body}
          onBodyChange={setBody}
          fields={fields}
          onFieldsChange={setFields}
          onBack={() => setStep('method')}
          onNext={() => setStep('review')}
        />
      )}

      {step === 'review' && contract && (
        <ReviewStep contract={contract} parties={parties} fields={fields} onBack={() => setStep(method === 'editor' ? 'editor' : 'fields')} />
      )}

      {busy && <p className="mt-4 text-sm text-slate">جارِ المعالجة...</p>}
    </div>
  );
}
