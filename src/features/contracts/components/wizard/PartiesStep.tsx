import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { Button } from '@/shared/ui/Button';
import { fetchPricingSettings, calculateInvoice, type PricingSettings } from '../../api/pricingApi';
import { previewDiscountCode, type DiscountPreview } from '../../api/discountCodesApi';
import { PARTY_ROLE_OPTIONS } from '../../types';

export interface DraftParty {
  role_label: string;
  custom_role: string;
  full_name: string;
  national_id: string;
  email: string;
  phone: string;
}

function emptyParty(): DraftParty {
  return { role_label: 'الطرف الأول', custom_role: '', full_name: '', national_id: '', email: '', phone: '' };
}

interface PartiesStepProps {
  title: string;
  onTitleChange: (v: string) => void;
  durationDays: string;
  onDurationChange: (v: string) => void;
  parties: DraftParty[];
  onPartiesChange: (parties: DraftParty[]) => void;
  onNext: (validDiscountCode: string | null) => void;
}

export function PartiesStep({
  title,
  onTitleChange,
  durationDays,
  onDurationChange,
  parties,
  onPartiesChange,
  onNext,
}: PartiesStepProps) {
  const [pricing, setPricing] = useState<PricingSettings | null>(null);
  const [error, setError] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [discountPreview, setDiscountPreview] = useState<DiscountPreview | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);

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
      if (!p.full_name.trim()) {
        setError('اسم كل طرف مطلوب');
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-bold text-ink">صفة الطرف</span>
                <select
                  value={party.role_label}
                  onChange={(e) => updateParty(index, { role_label: e.target.value })}
                  className="w-full rounded-lg border border-line px-3 py-2 text-ink outline-none focus:border-seal"
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
              <Field label="الاسم" value={party.full_name} onChange={(v) => updateParty(index, { full_name: v })} required />
              <Field label="رقم الهوية أو الإقامة" value={party.national_id} onChange={(v) => updateParty(index, { national_id: v })} />
              <Field label="البريد الإلكتروني" value={party.email} onChange={(v) => updateParty(index, { email: v })} type="email" />
              <Field label="رقم الجوال" value={party.phone} onChange={(v) => updateParty(index, { phone: v })} />
            </div>
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
        <Button onClick={submit}>التالي: رفع المستند</Button>
      </div>
    </div>
  );
}

export { emptyParty };
