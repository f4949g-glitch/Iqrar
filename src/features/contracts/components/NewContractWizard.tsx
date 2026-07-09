import { useState } from 'react';
import { PartiesStep, emptyParty, type DraftParty } from './wizard/PartiesStep';
import { UploadStep } from './wizard/UploadStep';
import { FieldsStep } from './wizard/FieldsStep';
import { ReviewStep } from './wizard/ReviewStep';
import { addParty, createDraftContract, getOriginalPdfUrl, uploadOriginalPdf } from '../api/contractsApi';
import type { Contract, ContractField, ContractParty } from '../types';

type Step = 'parties' | 'upload' | 'fields' | 'review';

const STEP_ORDER: Step[] = ['parties', 'upload', 'fields', 'review'];
const STEP_LABELS: Record<Step, string> = {
  parties: 'بيانات الأطراف',
  upload: 'رفع المستند',
  fields: 'الحقول',
  review: 'المراجعة والإرسال',
};

export function NewContractWizard() {
  const [step, setStep] = useState<Step>('parties');
  const [title, setTitle] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [draftParties, setDraftParties] = useState<DraftParty[]>([emptyParty()]);
  const [contract, setContract] = useState<Contract | null>(null);
  const [parties, setParties] = useState<ContractParty[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pdfUrl, setPdfUrl] = useState('');
  const [fields, setFields] = useState<ContractField[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const goToUpload = async () => {
    setBusy(true);
    setError('');
    try {
      const created = await createDraftContract(title.trim(), durationDays ? Number(durationDays) : null);
      const createdParties: ContractParty[] = [];
      for (let i = 0; i < draftParties.length; i++) {
        const p = draftParties[i];
        const role = p.role_label === 'أخرى' ? p.custom_role.trim() : p.role_label;
        const party = await addParty(created.id, {
          role_label: role,
          full_name: p.full_name.trim(),
          national_id: p.national_id.trim() || undefined,
          email: p.email.trim() || undefined,
          phone: p.phone.trim() || undefined,
          order_index: i,
        });
        createdParties.push(party);
      }
      setContract(created);
      setParties(createdParties);
      setStep('upload');
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

  const stepIndex = STEP_ORDER.indexOf(step);

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-ink">عقد جديد</h1>

      <div className="mb-8 flex items-center gap-2">
        {STEP_ORDER.map((s, i) => (
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
            {i < STEP_ORDER.length - 1 && <div className="h-px flex-1 bg-line" />}
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
          parties={draftParties}
          onPartiesChange={setDraftParties}
          onNext={goToUpload}
        />
      )}

      {step === 'upload' && contract && (
        <UploadStep
          file={file}
          onFileChange={(f, pages) => {
            setFile(f);
            setPageCount(pages);
          }}
          onBack={() => setStep('parties')}
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

      {step === 'review' && contract && (
        <ReviewStep contract={contract} parties={parties} fields={fields} onBack={() => setStep('fields')} />
      )}

      {busy && <p className="mt-4 text-sm text-slate">جارِ المعالجة...</p>}
    </div>
  );
}
