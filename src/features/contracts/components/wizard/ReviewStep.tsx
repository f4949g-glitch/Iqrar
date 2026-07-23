import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { JSONContent } from '@tiptap/react';
import { CreditCard, Eye, UserCheck, X } from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { Button } from '@/shared/ui/Button';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import { sendContract, updateParty, type NewPartyInput } from '../../api/contractsApi';
import { clearWizardProgress } from '../../lib/wizardProgress';
import { fetchPricingSettings, calculateInvoice, type PricingSettings } from '../../api/pricingApi';
import { previewDiscountCode, setContractDiscountCode, type DiscountPreview } from '../../api/discountCodesApi';
import { fetchMyBalance } from '../../api/creditCodesApi';
import { renderContractHtml, renderPartiesHeaderHtml, renderTermLineHtml, escapeHtml, type JsonNode } from '../../editor/renderContractHtml';
import { DOCUMENT_TYPE_DEFINITE_LABELS, FIELD_TYPE_LABELS, type Contract, type ContractField, type ContractParty } from '../../types';
import type { Profile } from '@/features/auth';

interface ReviewStepProps {
  contract: Contract;
  parties: ContractParty[];
  fields: ContractField[];
  body: JSONContent | null;
  pdfUrl: string;
  companyLogoDataUrl: string | null;
  profile?: Profile | null;
  // كود خصم طُبِّق مسبقًا ونجحت معاينته في نافذة الصفحة الرئيسية قبل إنشاء
  // العقد — يُطبَّق هنا تلقائيًا على العقد الحقيقي بدل مطالبة المستخدم بإعادة كتابته.
  initialDiscountCode?: string;
  onBack: () => void;
}

export function ReviewStep({
  contract: initialContract,
  parties: initialParties,
  fields,
  body,
  pdfUrl,
  companyLogoDataUrl,
  profile = null,
  initialDiscountCode,
  onBack,
}: ReviewStepProps) {
  const navigate = useNavigate();
  const [contract, setContract] = useState(initialContract);
  const [parties, setParties] = useState(initialParties);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pricing, setPricing] = useState<PricingSettings | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [discountPreview, setDiscountPreview] = useState<DiscountPreview | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [savingSelf, setSavingSelf] = useState(false);
  // بوابة الدفع الفعلية غير مربوطة بعد؛ بيانات البطاقة أصفار تمهيدية للاختبار
  // فقط، وسيُستبدل هذا الحقل بمُكوّن بوابة الدفع الحقيقي عند توفر بيانات الحساب.
  const [cardNumber] = useState('0000 0000 0000 0000');
  const [cardExpiry] = useState('00/00');
  const [cardCvv] = useState('000');
  const [balance, setBalance] = useState<number | null>(null);
  const [useBalance, setUseBalance] = useState(false);
  const [balanceAmountInput, setBalanceAmountInput] = useState('0');
  const docLabel = DOCUMENT_TYPE_DEFINITE_LABELS[contract.document_type];

  useEffect(() => {
    fetchPricingSettings()
      .then(setPricing)
      .catch(() => setPricing(null));
    fetchMyBalance()
      .then(setBalance)
      .catch(() => setBalance(null));
  }, []);

  const invoice = pricing ? calculateInvoice(parties.length, pricing) : null;
  const invoiceTotal = discountPreview?.discount_code_id ? discountPreview.final_amount : (invoice ?? 0);
  const maxUsableBalance = balance !== null ? Math.min(balance, invoiceTotal) : 0;
  const balanceAmountToUse = useBalance ? Math.min(Math.max(parseFloat(balanceAmountInput) || 0, 0), maxUsableBalance) : 0;
  const remainingAfterBalance = Math.max(invoiceTotal - balanceAmountToUse, 0);

  // الطرف الذي يمثّل صاحب الحساب الحالي (لا يوجد عمود "is_self" في القاعدة، فيُحدَّد
  // بمطابقة رقم الهوية مع بيانات الحساب) — يُسمح له بتصحيح بياناته هنا مباشرة بدل
  // الاضطرار للرجوع لخطوة الأطراف عند ملاحظة خطأ في اللحظة الأخيرة.
  const selfPartyId = profile?.national_id ? parties.find((p) => p.national_id === profile.national_id)?.id ?? null : null;

  const updateSelfParty = async (patch: Partial<Pick<NewPartyInput, 'full_name' | 'phone' | 'email'>>) => {
    if (!selfPartyId) return;
    setSavingSelf(true);
    try {
      const updated = await updateParty(selfPartyId, patch);
      setParties((prev) => prev.map((p) => (p.id === selfPartyId ? updated : p)));
    } catch (err) {
      setError(getErrorMessage(err, 'تعذّر تحديث بياناتك'));
    } finally {
      setSavingSelf(false);
    }
  };

  // معاينة المحتوى قبل الإرسال للتوثيق: للمستندات المكتوبة بالمحرر تُبنى نفس
  // مكوّنات المستند النهائي (شعار المنشأة، مدة السريان، جدول الأطراف، النص)
  // محليًا دون حاجة لخادم؛ أما المرفوعة كملف PDF فتُعرض كما رُفعت مباشرة.
  const editorPreviewHtml = useMemo(() => {
    if (contract.source_type !== 'editor' || !body) return '';
    const logoHtml = companyLogoDataUrl
      ? `<div style="text-align:center;margin-bottom:16px"><img src="${companyLogoDataUrl}" alt="شعار المنشأة" style="max-height:90px;max-width:220px;object-fit:contain" /></div>`
      : '';
    return (
      logoHtml +
      `<h1 class="contract-title">${escapeHtml(contract.title)}</h1>` +
      renderTermLineHtml(contract) +
      renderPartiesHeaderHtml(parties) +
      renderContractHtml(body as unknown as JsonNode, parties)
    );
  }, [contract, parties, body, companyLogoDataUrl]);

  const applyDiscountCode = async (codeOverride?: string) => {
    const code = (codeOverride ?? discountCode).trim();
    if (!code) return;
    setCheckingCode(true);
    setDiscountPreview(null);
    try {
      const result = await previewDiscountCode(code, parties.length);
      setDiscountPreview(result);
      if (result.discount_code_id) {
        await setContractDiscountCode(contract.id, code);
        setContract((prev) => ({ ...prev, discount_code_id: result.discount_code_id }));
      }
    } catch (err) {
      setDiscountPreview({ discount_code_id: null, discount_percent: null, base_amount: 0, final_amount: 0, message: getErrorMessage(err, 'تعذّر التحقق من الكود') });
    } finally {
      setCheckingCode(false);
    }
  };

  // كود خصم طُبِّق مسبقًا من نافذة الصفحة الرئيسية (initialDiscountCode) يُربَط
  // تلقائيًا بالعقد الحقيقي فور توفّره هنا، بدل مطالبة المستخدم بإعادة كتابته.
  useEffect(() => {
    if (initialDiscountCode) {
      setDiscountCode(initialDiscountCode);
      applyDiscountCode(initialDiscountCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = async () => {
    setSubmitting(true);
    setError('');
    try {
      await sendContract(contract.id, balanceAmountToUse);
      clearWizardProgress(contract.document_type);
      navigate(`/app/contracts/${contract.id}`);
    } catch (err) {
      setError(getErrorMessage(err, `تعذّر إرسال ${docLabel}`));
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* العنوان */}
      <div className="rounded-xl border border-line bg-card p-5">
        <h3 className="mb-1 font-display text-lg font-bold text-ink">{contract.title}</h3>
        {contract.duration_days && <p className="text-xs text-slate">مدة التوثيق: {contract.duration_days} يومًا</p>}
      </div>

      {/* محتوى العقد: معاينة مباشرة داخل الصفحة بدل الاقتصار على نافذة منبثقة فقط */}
      {(editorPreviewHtml || pdfUrl) && (
        <div className="rounded-xl border border-line bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-display text-sm font-bold text-ink">محتوى {docLabel}</h4>
            <Button variant="secondary" onClick={() => setShowPreview(true)} disabled={submitting}>
              <span className="flex items-center gap-1.5">
                <Eye size={16} /> معاينة كاملة
              </span>
            </Button>
          </div>
          {editorPreviewHtml ? (
            <div
              className="prose max-h-64 max-w-none overflow-y-auto rounded-lg border border-line bg-white p-4 text-sm text-ink"
              dangerouslySetInnerHTML={{ __html: editorPreviewHtml }}
            />
          ) : (
            <iframe src={pdfUrl} title="معاينة المستند" className="h-64 w-full rounded-lg border border-line" />
          )}
        </div>
      )}

      {/* عدد الأطراف */}
      <div className="rounded-xl border border-line bg-card p-5">
        <h4 className="mb-3 font-display text-sm font-bold text-ink">الأطراف ({parties.length})</h4>
        <ul className="space-y-2">
          {parties.map((p) => (
            <li key={p.id} className="rounded-lg border border-line p-2.5">
              {p.id === selfPartyId ? (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-seal">
                    <UserCheck size={14} /> بياناتك — يمكنك تصحيحها هنا مباشرة
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Field label="الاسم" value={p.full_name ?? ''} onChange={(v) => updateSelfParty({ full_name: v })} disabled={savingSelf} />
                    <Field label="الجوال" value={p.phone ?? ''} onChange={(v) => updateSelfParty({ phone: v })} phone disabled={savingSelf} />
                    <Field label="البريد الإلكتروني" value={p.email ?? ''} onChange={(v) => updateSelfParty({ email: v })} type="email" disabled={savingSelf} />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink">{p.full_name}</span>
                  <span className="text-slate">{p.role_label}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* الحقول */}
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

      {/* التكلفة والخصم */}
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
          <Button variant="secondary" onClick={() => applyDiscountCode()} disabled={checkingCode || !discountCode.trim()}>
            {checkingCode ? 'جارِ التحقق...' : 'تطبيق'}
          </Button>
        </div>
        {discountPreview && (
          <p className={`mt-2 text-xs font-bold ${discountPreview.discount_code_id ? 'text-sage' : 'text-clay'}`}>
            {discountPreview.discount_code_id ? `تم تطبيق الكود: خصم ${discountPreview.discount_percent}%` : discountPreview.message}
          </p>
        )}
        {balance !== null && (
          <p className="mt-2 text-xs text-slate">
            رصيدك المتاح: <span className="font-bold text-ink">{balance.toFixed(2)} ريال</span> — يمكنك استخدامه كليًا أو جزئيًا في بوابة الدفع.
          </p>
        )}
      </div>

      {error && <p className="text-sm font-bold text-clay">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="secondary" onClick={onBack} disabled={submitting}>
          السابق
        </Button>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowPayment(true)} disabled={submitting}>
            {submitting ? 'جارِ الإرسال...' : `المتابعة للدفع وإرسال ${docLabel}`}
          </Button>
        </div>
      </div>

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4" dir="rtl" onClick={() => setShowPreview(false)}>
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-md border border-line bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line p-4">
              <h3 className="font-display text-sm font-bold text-ink">معاينة {docLabel} قبل الإرسال للتوثيق</h3>
              <button type="button" onClick={() => setShowPreview(false)} aria-label="إغلاق" className="text-slate hover:text-ink">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              {editorPreviewHtml ? (
                <div className="prose max-w-none rounded-lg bg-white p-4 text-sm text-ink" dangerouslySetInnerHTML={{ __html: editorPreviewHtml }} />
              ) : pdfUrl ? (
                <iframe src={pdfUrl} title="معاينة المستند" className="h-[70vh] w-full rounded-lg border border-line" />
              ) : null}
            </div>
          </div>
        </div>
      )}

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
              {balance !== null && balance > 0 && (
                <div className="rounded-lg border border-line bg-paper p-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-ink">
                    <input
                      type="checkbox"
                      checked={useBalance}
                      onChange={(e) => {
                        setUseBalance(e.target.checked);
                        if (e.target.checked) setBalanceAmountInput(maxUsableBalance.toFixed(2));
                      }}
                    />
                    الخصم من رصيدي (المتاح: {balance.toFixed(2)} ريال)
                  </label>
                  {useBalance && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={maxUsableBalance}
                        step="0.01"
                        dir="ltr"
                        value={balanceAmountInput}
                        onChange={(e) => setBalanceAmountInput(e.target.value)}
                        className="w-28 rounded-lg border border-line bg-white px-2 py-1.5 text-center text-sm text-ink outline-none"
                      />
                      <span className="text-xs text-slate">ريال</span>
                      <button
                        type="button"
                        onClick={() => setBalanceAmountInput(maxUsableBalance.toFixed(2))}
                        className="text-xs font-bold text-seal hover:underline"
                      >
                        استخدام الحد الأقصى
                      </button>
                    </div>
                  )}
                </div>
              )}
              {remainingAfterBalance > 0 ? (
                <>
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
                </>
              ) : (
                useBalance && (
                  <p className="rounded-lg bg-sageLight p-3 text-center text-xs font-bold text-sage">مغطى بالكامل من رصيدك، لا حاجة لبطاقة دفع</p>
                )
              )}
              {invoice !== null && (
                <p className="rounded-lg bg-sealLight p-3 text-center text-sm font-bold text-seal">
                  {balanceAmountToUse > 0 ? (
                    <>
                      المبلغ المطلوب عبر البطاقة: {remainingAfterBalance.toFixed(2)} ريال
                      <span className="mt-1 block text-xs font-normal text-slate">
                        (من إجمالي {invoiceTotal.toFixed(2)} ريال، بعد خصم {balanceAmountToUse.toFixed(2)} ريال من رصيدك)
                      </span>
                    </>
                  ) : (
                    <>المبلغ المطلوب: {invoiceTotal.toFixed(2)} ريال</>
                  )}
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
