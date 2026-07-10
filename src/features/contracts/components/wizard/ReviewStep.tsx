import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { Button } from '@/shared/ui/Button';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import { sendContract } from '../../api/contractsApi';
import { fetchPricingSettings, calculateInvoice, type PricingSettings } from '../../api/pricingApi';
import { previewDiscountCode, setContractDiscountCode, type DiscountPreview } from '../../api/discountCodesApi';
import { DOCUMENT_TYPE_DEFINITE_LABELS, FIELD_TYPE_LABELS, type Contract, type ContractField, type ContractParty } from '../../types';

interface ReviewStepProps {
  contract: Contract;
  parties: ContractParty[];
  fields: ContractField[];
  onBack: () => void;
}

export function ReviewStep({ contract: initialContract, parties, fields, onBack }: ReviewStepProps) {
  const navigate = useNavigate();
  const [contract, setContract] = useState(initialContract);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pricing, setPricing] = useState<PricingSettings | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [discountPreview, setDiscountPreview] = useState<DiscountPreview | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  // بوابة الدفع الفعلية غير مربوطة بعد؛ بيانات البطاقة أصفار تمهيدية للاختبار
  // فقط، وسيُستبدل هذا الحقل بمُكوّن بوابة الدفع الحقيقي عند توفر بيانات الحساب.
  const [cardNumber] = useState('0000 0000 0000 0000');
  const [cardExpiry] = useState('00/00');
  const [cardCvv] = useState('000');
  const docLabel = DOCUMENT_TYPE_DEFINITE_LABELS[contract.document_type];

  useEffect(() => {
    fetchPricingSettings()
      .then(setPricing)
      .catch(() => setPricing(null));
  }, []);

  const invoice = pricing ? calculateInvoice(parties.length, pricing) : null;

  const applyDiscountCode = async () => {
    if (!discountCode.trim()) return;
    setCheckingCode(true);
    setDiscountPreview(null);
    try {
      const result = await previewDiscountCode(discountCode.trim(), parties.length);
      setDiscountPreview(result);
      if (result.discount_code_id) {
        await setContractDiscountCode(contract.id, discountCode.trim());
        setContract((prev) => ({ ...prev, discount_code_id: result.discount_code_id }));
      }
    } catch (err) {
      setDiscountPreview({ discount_code_id: null, discount_percent: null, base_amount: 0, final_amount: 0, message: getErrorMessage(err, 'تعذّر التحقق من الكود') });
    } finally {
      setCheckingCode(false);
    }
  };

  const send = async () => {
    setSubmitting(true);
    setError('');
    try {
      await sendContract(contract.id);
      navigate(`/app/contracts/${contract.id}`);
    } catch (err) {
      setError(getErrorMessage(err, `تعذّر إرسال ${docLabel}`));
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-line bg-card p-5">
        <h3 className="mb-1 font-display text-lg font-bold text-ink">{contract.title}</h3>
        {contract.duration_days && <p className="text-xs text-slate">مدة التوثيق: {contract.duration_days} يومًا</p>}
      </div>

      <div className="rounded-xl border border-line bg-card p-5">
        <h4 className="mb-3 font-display text-sm font-bold text-ink">الدفع والخصم</h4>
        {invoice !== null && (
          <p className="mb-3 text-sm font-bold text-seal">
            {discountPreview?.discount_code_id ? (
              <>
                <span className="ms-1 line-through opacity-60">{invoice.toFixed(2)}</span>
                <span className="mx-1">{discountPreview.final_amount.toFixed(2)} ريال (بعد خصم {discountPreview.discount_percent}%)</span>
              </>
            ) : (
              <span>التكلفة المتوقعة: {invoice.toFixed(2)} ريال</span>
            )}
          </p>
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
          <Button variant="secondary" onClick={applyDiscountCode} disabled={checkingCode || !discountCode.trim()}>
            {checkingCode ? 'جارِ التحقق...' : 'تطبيق'}
          </Button>
        </div>
        {discountPreview && (
          <p className={`mt-2 text-xs font-bold ${discountPreview.discount_code_id ? 'text-sage' : 'text-clay'}`}>
            {discountPreview.discount_code_id ? `تم تطبيق الكود: خصم ${discountPreview.discount_percent}%` : discountPreview.message}
          </p>
        )}
        <p className="mt-2 text-xs text-slate">سيُخصم مبلغ الفاتورة النهائي من رصيدك عند الإرسال.</p>
      </div>

      <div className="rounded-xl border border-line bg-card p-5">
        <h4 className="mb-3 font-display text-sm font-bold text-ink">الأطراف ({parties.length})</h4>
        <ul className="space-y-2">
          {parties.map((p) => (
            <li key={p.id} className="flex items-center justify-between text-sm">
              <span className="text-ink">{p.full_name}</span>
              <span className="text-slate">{p.role_label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-line bg-card p-5">
        <h4 className="mb-3 font-display text-sm font-bold text-ink">الحقول ({fields.length})</h4>
        <ul className="space-y-1 text-sm text-slate">
          {fields.map((f) => {
            const party = parties.find((p) => p.id === f.party_id);
            return (
              <li key={f.id}>
                {f.page_number ? `صفحة ${f.page_number} — ` : ''}
                {FIELD_TYPE_LABELS[f.field_type]} ({party?.full_name ?? '—'})
              </li>
            );
          })}
        </ul>
      </div>

      {error && <p className="text-sm font-bold text-clay">{error}</p>}

      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack} disabled={submitting}>
          السابق
        </Button>
        <Button onClick={() => setShowPayment(true)} disabled={submitting}>
          {submitting ? 'جارِ الإرسال...' : `المتابعة للدفع وإرسال ${docLabel}`}
        </Button>
      </div>

      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4" dir="rtl" onClick={() => !submitting && setShowPayment(false)}>
          <div className="w-full max-w-sm rounded-md border border-line bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-md bg-sealLight">
                <CreditCard size={22} className="text-seal" />
              </div>
              <h3 className="font-display text-lg font-bold text-ink">بوابة الدفع</h3>
              <p className="mt-1 text-xs text-slate">بوابة الدفع الفعلية قيد الربط — البيانات أدناه تجريبية لأغراض الاختبار فقط</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate">رقم البطاقة</label>
                <input
                  value={cardNumber}
                  readOnly
                  dir="ltr"
                  className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-center text-ink outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate">تاريخ الانتهاء</label>
                  <input
                    value={cardExpiry}
                    readOnly
                    dir="ltr"
                    className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-center text-ink outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate">رمز التحقق CVV</label>
                  <input
                    value={cardCvv}
                    readOnly
                    dir="ltr"
                    className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-center text-ink outline-none"
                  />
                </div>
              </div>
              {invoice !== null && (
                <p className="rounded-lg bg-sealLight p-3 text-center text-sm font-bold text-seal">
                  المبلغ المطلوب: {(discountPreview?.discount_code_id ? discountPreview.final_amount : invoice).toFixed(2)} ريال
                </p>
              )}
              {error && <p className="text-sm font-bold text-clay">{error}</p>}
              <Button onClick={send} disabled={submitting} className="w-full">
                {submitting ? 'جارِ معالجة الدفع...' : `الدفع وإرسال ${docLabel} للتوثيق`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
