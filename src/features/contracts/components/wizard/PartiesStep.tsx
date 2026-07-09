import { useEffect, useState } from 'react';
import { Building2, Plus, ShieldCheck, Trash2, User } from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { Button } from '@/shared/ui/Button';
import { fetchPricingSettings, calculateInvoice, type PricingSettings } from '../../api/pricingApi';
import { previewDiscountCode, type DiscountPreview } from '../../api/discountCodesApi';
import { addParty as addPartyApi } from '../../api/contractsApi';
import { initiateNafathVerification, checkNafathStatus } from '../../api/nafathApi';
import { PARTY_ROLE_OPTIONS, DOCUMENT_TYPE_LABELS, type DocumentType, type PartyType, type VerificationMethod } from '../../types';
import type { Contract } from '../../types';

export interface DraftParty {
  partyId?: string;
  party_type: PartyType;
  entity_name: string;
  entity_cr_number: string;
  role_label: string;
  custom_role: string;
  full_name: string;
  national_id: string;
  nationality: string;
  address: string;
  email: string;
  phone: string;
  verification_method: VerificationMethod;
  date_of_birth: string;
  nafathState: 'idle' | 'initiating' | 'waiting' | 'checking' | 'not_configured' | 'error';
  nafathMessage: string;
  randomCode: string;
}

function emptyParty(): DraftParty {
  return {
    party_type: 'individual',
    entity_name: '',
    entity_cr_number: '',
    role_label: 'الطرف الأول',
    custom_role: '',
    full_name: '',
    national_id: '',
    nationality: '',
    address: '',
    email: '',
    phone: '',
    verification_method: 'manual',
    date_of_birth: '',
    nafathState: 'idle',
    nafathMessage: '',
    randomCode: '',
  };
}

interface PartiesStepProps {
  title: string;
  onTitleChange: (v: string) => void;
  durationDays: string;
  onDurationChange: (v: string) => void;
  documentType: DocumentType;
  onDocumentTypeChange: (v: DocumentType) => void;
  companyName: string;
  onCompanyNameChange: (v: string) => void;
  companyCrNumber: string;
  onCompanyCrNumberChange: (v: string) => void;
  parties: DraftParty[];
  onPartiesChange: (parties: DraftParty[]) => void;
  ensureContract: () => Promise<Contract>;
  onNext: (validDiscountCode: string | null) => void;
}

export function PartiesStep({
  title,
  onTitleChange,
  durationDays,
  onDurationChange,
  documentType,
  onDocumentTypeChange,
  companyName,
  onCompanyNameChange,
  companyCrNumber,
  onCompanyCrNumberChange,
  parties,
  onPartiesChange,
  ensureContract,
  onNext,
}: PartiesStepProps) {
  const [pricing, setPricing] = useState<PricingSettings | null>(null);
  const [error, setError] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [discountPreview, setDiscountPreview] = useState<DiscountPreview | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const [showCompany, setShowCompany] = useState(Boolean(companyName || companyCrNumber));

  useEffect(() => {
    fetchPricingSettings()
      .then(setPricing)
      .catch(() => setPricing(null));
  }, []);

  const updateParty = (index: number, patch: Partial<DraftParty>) => {
    const next = parties.map((p, i) => (i === index ? { ...p, ...patch } : p));
    onPartiesChange(next);
  };

  const addParty = () => onPartiesChange([...parties, emptyParty()]);
  const removeParty = (index: number) => onPartiesChange(parties.filter((_, i) => i !== index));

  const startNafathVerification = async (index: number) => {
    const party = parties[index];
    if (!party.national_id.trim() || !party.date_of_birth) {
      updateParty(index, { nafathState: 'error', nafathMessage: 'أدخل رقم الهوية وتاريخ الميلاد أولًا' });
      return;
    }
    updateParty(index, { nafathState: 'initiating', nafathMessage: '' });
    try {
      const contract = await ensureContract();
      let partyId = party.partyId;
      if (!partyId) {
        const role = party.role_label === 'أخرى' ? party.custom_role.trim() : party.role_label;
        const created = await addPartyApi(contract.id, {
          role_label: role || 'طرف',
          national_id: party.national_id.trim(),
          date_of_birth: party.date_of_birth,
          email: party.email.trim() || undefined,
          phone: party.phone.trim() || undefined,
          order_index: index,
          verification_method: 'nafath',
        });
        partyId = created.id;
        updateParty(index, { partyId });
      }
      const result = await initiateNafathVerification(partyId);
      if (!result.configured) {
        updateParty(index, { nafathState: 'not_configured', nafathMessage: result.message ?? 'التحقق عبر نفاذ غير مُفعَّل بعد' });
        return;
      }
      if (result.error) {
        updateParty(index, { nafathState: 'error', nafathMessage: result.error });
        return;
      }
      updateParty(index, { nafathState: 'waiting', randomCode: result.random_code ?? '' });
    } catch (err) {
      updateParty(index, { nafathState: 'error', nafathMessage: err instanceof Error ? err.message : 'تعذّر بدء التحقق' });
    }
  };

  const pollNafathStatus = async (index: number) => {
    const party = parties[index];
    if (!party.partyId) return;
    updateParty(index, { nafathState: 'checking' });
    try {
      const result = await checkNafathStatus(party.partyId);
      if (!result.configured) {
        updateParty(index, { nafathState: 'not_configured', nafathMessage: result.message ?? '' });
        return;
      }
      if (result.status === 'completed' && result.full_name) {
        updateParty(index, { full_name: result.full_name, nafathState: 'idle', nafathMessage: 'تم التوثيق عبر نفاذ' });
      } else {
        updateParty(index, { nafathState: 'waiting', nafathMessage: 'بانتظار الموافقة عبر تطبيق نفاذ...' });
      }
    } catch (err) {
      updateParty(index, { nafathState: 'error', nafathMessage: err instanceof Error ? err.message : 'تعذّر التحقق من الحالة' });
    }
  };

  const submit = () => {
    setError('');
    if (!title.trim()) {
      setError('عنوان العقد مطلوب');
      return;
    }
    if (parties.length === 0) {
      setError('أضف طرفًا واحدًا على الأقل');
      return;
    }
    for (const p of parties) {
      if (p.party_type === 'entity' && !p.entity_name.trim()) {
        setError('اسم المنشأة مطلوب لكل طرف من نوع منشأة');
        return;
      }
      if (!p.full_name.trim()) {
        setError(p.party_type === 'entity' ? 'اسم ممثل المنشأة مطلوب' : 'اسم كل طرف مطلوب (أكمل التحقق عبر نفاذ أو أدخله يدويًا)');
        return;
      }
      if (p.role_label === 'أخرى' && !p.custom_role.trim()) {
        setError('حدد مسمّى الصفة عند اختيار "أخرى"');
        return;
      }
    }
    if (discountCode.trim() && (!discountPreview || discountPreview.discount_code_id === null)) {
      setError('كود الخصم المُدخل غير صالح — تحقّق منه أو أزله قبل المتابعة');
      return;
    }
    onNext(discountPreview?.discount_code_id ? discountCode.trim() : null);
  };

  const checkDiscountCode = async () => {
    if (!discountCode.trim()) {
      setDiscountPreview(null);
      return;
    }
    setCheckingCode(true);
    try {
      const result = await previewDiscountCode(discountCode.trim(), parties.length);
      setDiscountPreview(result);
    } catch {
      setDiscountPreview({ discount_code_id: null, discount_percent: null, base_amount: 0, final_amount: 0, message: 'تعذّر التحقق من الكود' });
    } finally {
      setCheckingCode(false);
    }
  };

  const invoice = pricing ? calculateInvoice(parties.length, pricing) : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="عنوان العقد" value={title} onChange={onTitleChange} required />
        <Field label="مدة توثيق العقد (أيام)" value={durationDays} onChange={onDurationChange} type="number" placeholder="مثال: 30" />
        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-bold text-slate">نوع الوثيقة</span>
          <select
            value={documentType}
            onChange={(e) => onDocumentTypeChange(e.target.value as DocumentType)}
            className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-ink outline-none focus:border-seal"
          >
            {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-xl border border-line bg-card p-4">
        {!showCompany ? (
          <button type="button" onClick={() => setShowCompany(true)} className="text-sm font-bold text-seal">
            + إرفاق بيانات منشأة صادرة عنها العقد (اختياري)
          </button>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="اسم المنشأة (اختياري)" value={companyName} onChange={onCompanyNameChange} />
            <Field label="رقم السجل التجاري (اختياري)" value={companyCrNumber} onChange={onCompanyCrNumberChange} />
          </div>
        )}
      </div>

      {invoice !== null && (
        <div className="rounded-lg bg-sealLight p-3 text-sm font-bold text-seal">
          الرسوم المتوقعة لعدد الأطراف الحالي ({parties.length}):{' '}
          {discountPreview?.discount_code_id ? (
            <>
              <span className="ms-1 line-through opacity-60">{invoice.toFixed(2)}</span>
              <span className="mx-1">{discountPreview.final_amount.toFixed(2)} ريال (بعد خصم {discountPreview.discount_percent}%)</span>
            </>
          ) : (
            <span>{invoice.toFixed(2)} ريال</span>
          )}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Field
            label="كود الخصم (اختياري)"
            value={discountCode}
            onChange={(v) => {
              setDiscountCode(v);
              setDiscountPreview(null);
            }}
          />
        </div>
        <Button variant="secondary" onClick={checkDiscountCode} disabled={checkingCode || !discountCode.trim()}>
          {checkingCode ? 'جارِ التحقق...' : 'تحقّق'}
        </Button>
      </div>
      {discountPreview && (
        <p className={`text-xs font-bold ${discountPreview.discount_code_id ? 'text-sage' : 'text-clay'}`}>
          {discountPreview.discount_code_id ? `كود صالح: خصم ${discountPreview.discount_percent}%` : discountPreview.message}
        </p>
      )}

      <div className="space-y-4">
        {parties.map((party, index) => (
          <div key={index} className="rounded-xl border border-line bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-sm font-bold text-ink">الطرف {index + 1}</p>
              {parties.length > 1 && (
                <button type="button" onClick={() => removeParty(index)} className="text-clay">
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <div className="mb-3 flex gap-1.5 rounded-lg bg-paper p-1">
              <button
                type="button"
                onClick={() => updateParty(index, { party_type: 'individual' })}
                className={`flex-1 rounded-md py-1.5 text-xs font-bold transition ${
                  party.party_type === 'individual' ? 'bg-card text-ink shadow-sm' : 'text-slate'
                }`}
              >
                <span className="flex items-center justify-center gap-1">
                  <User size={13} /> فرد
                </span>
              </button>
              <button
                type="button"
                onClick={() => updateParty(index, { party_type: 'entity' })}
                className={`flex-1 rounded-md py-1.5 text-xs font-bold transition ${
                  party.party_type === 'entity' ? 'bg-card text-ink shadow-sm' : 'text-slate'
                }`}
              >
                <span className="flex items-center justify-center gap-1">
                  <Building2 size={13} /> منشأة
                </span>
              </button>
            </div>

            {party.party_type === 'entity' && (
              <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="اسم المنشأة" value={party.entity_name} onChange={(v) => updateParty(index, { entity_name: v })} required />
                <Field label="رقم السجل التجاري" value={party.entity_cr_number} onChange={(v) => updateParty(index, { entity_cr_number: v })} />
              </div>
            )}

            <div className="mb-3 flex gap-1.5 rounded-lg bg-paper p-1">
              <button
                type="button"
                onClick={() => updateParty(index, { verification_method: 'manual' })}
                className={`flex-1 rounded-md py-1.5 text-xs font-bold transition ${
                  party.verification_method === 'manual' ? 'bg-card text-ink shadow-sm' : 'text-slate'
                }`}
              >
                إدخال يدوي
              </button>
              <button
                type="button"
                onClick={() => updateParty(index, { verification_method: 'nafath' })}
                className={`flex-1 rounded-md py-1.5 text-xs font-bold transition ${
                  party.verification_method === 'nafath' ? 'bg-card text-ink shadow-sm' : 'text-slate'
                }`}
              >
                <span className="flex items-center justify-center gap-1">
                  <ShieldCheck size={13} /> تحقق عبر نفاذ
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-bold text-ink">{party.party_type === 'entity' ? 'صفة ممثل المنشأة' : 'صفة الطرف'}</span>
                <select
                  value={party.role_label}
                  onChange={(e) => updateParty(index, { role_label: e.target.value })}
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-seal"
                >
                  {PARTY_ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              {party.role_label === 'أخرى' && (
                <Field label="مسمّى الصفة" value={party.custom_role} onChange={(v) => updateParty(index, { custom_role: v })} required />
              )}

              {party.verification_method === 'nafath' && (
                <>
                  <Field label="رقم الهوية أو الإقامة (10 أرقام)" value={party.national_id} onChange={(v) => updateParty(index, { national_id: v })} required />
                  <Field label="تاريخ الميلاد" value={party.date_of_birth} onChange={(v) => updateParty(index, { date_of_birth: v })} type="date" required />
                </>
              )}

              <Field
                label={
                  party.party_type === 'entity'
                    ? 'اسم الممثل'
                    : party.verification_method === 'nafath'
                      ? 'الاسم (يُملأ تلقائيًا بعد التحقق، أو أدخله مؤقتًا)'
                      : 'الاسم'
                }
                value={party.full_name}
                onChange={(v) => updateParty(index, { full_name: v })}
                required
              />
              {party.verification_method === 'manual' && (
                <Field label="رقم الهوية أو الإقامة" value={party.national_id} onChange={(v) => updateParty(index, { national_id: v })} />
              )}
              <Field label="الجنسية" value={party.nationality} onChange={(v) => updateParty(index, { nationality: v })} />
              <Field label="العنوان" value={party.address} onChange={(v) => updateParty(index, { address: v })} />
              <Field label="البريد الإلكتروني" value={party.email} onChange={(v) => updateParty(index, { email: v })} type="email" />
              <Field label="رقم الجوال" value={party.phone} onChange={(v) => updateParty(index, { phone: v })} />
            </div>

            {party.verification_method === 'nafath' && (
              <div className="mt-3 rounded-lg bg-paper p-3">
                {party.nafathState === 'idle' && party.nafathMessage === 'تم التوثيق عبر نفاذ' ? (
                  <p className="text-xs font-bold text-sage">✓ تم التوثيق عبر نفاذ</p>
                ) : (
                  <>
                    {party.nafathState === 'idle' && (
                      <Button variant="secondary" onClick={() => startNafathVerification(index)}>
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck size={14} /> تحقق عبر نفاذ
                        </span>
                      </Button>
                    )}
                    {party.nafathState === 'initiating' && <p className="text-xs text-slate">جارِ إرسال طلب التحقق...</p>}
                    {party.nafathState === 'waiting' && (
                      <div className="space-y-2">
                        {party.randomCode && (
                          <p className="text-sm font-bold text-ink">
                            افتح تطبيق نفاذ ووافق على الرمز: <span className="text-seal">{party.randomCode}</span>
                          </p>
                        )}
                        <Button variant="secondary" onClick={() => pollNafathStatus(index)}>
                          تحقق من الحالة
                        </Button>
                      </div>
                    )}
                    {party.nafathState === 'checking' && <p className="text-xs text-slate">جارِ التحقق من الحالة...</p>}
                    {party.nafathState === 'not_configured' && <p className="text-xs font-bold text-clay">{party.nafathMessage}</p>}
                    {party.nafathState === 'error' && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-clay">{party.nafathMessage}</p>
                        <Button variant="secondary" onClick={() => startNafathVerification(index)}>
                          إعادة المحاولة
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <Button variant="secondary" onClick={addParty}>
        <span className="flex items-center gap-1.5">
          <Plus size={16} /> إضافة طرف
        </span>
      </Button>

      {error && <p className="text-sm font-bold text-clay">{error}</p>}

      <div className="flex justify-end">
        <Button onClick={submit}>التالي: طريقة إنشاء العقد</Button>
      </div>
    </div>
  );
}

export { emptyParty };
