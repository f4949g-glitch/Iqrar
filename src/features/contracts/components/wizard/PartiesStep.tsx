import { useEffect, useState } from 'react';
import { Building2, ChevronDown, Plus, ShieldCheck, Trash2, User, UserCheck } from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { Button } from '@/shared/ui/Button';
import { GregorianDateInput } from '@/shared/ui/GregorianDateInput';
import { fileToDataUrl } from '@/shared/lib/fileToDataUrl';
import { NATIONALITIES } from '@/shared/lib/nationalities';
import { fetchPricingSettings, calculateInvoice, type PricingSettings } from '../../api/pricingApi';
import { addParty as addPartyApi } from '../../api/contractsApi';
import { initiateNafathVerification, checkNafathStatus } from '../../api/nafathApi';
import { findDuplicateNationalId } from '../../lib/findDuplicateNationalId';
import type { Profile } from '@/features/auth';
import {
  PARTY_ROLE_OPTIONS,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_DEFINITE_LABELS,
  TERM_UNIT_LABELS,
  type DocumentType,
  type PartyType,
  type TermUnit,
  type VerificationMethod,
} from '../../types';
// ملاحظة: اختيار نوع الوثيقة (عقد/تفويض) أصبح يتم في خطوة سابقة على الصفحة
// الرئيسية (اختيار "إنشاء عقد" أو "إنشاء تفويض")، لذا لم يعد قابلًا للتعديل هنا.
import type { Contract } from '../../types';

export type TermMode = 'none' | 'duration' | 'date';

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
  // يُفعَّل عبر مربع اختيار "أضفني كطرف": يملأ بيانات هوية هذا الطرف من حساب
  // المستخدم الحالي ويقفلها، بدل تخصيص ذلك للطرف الأول دائمًا (السلوك السابق).
  is_self: boolean;
}

// صفة الطرف الافتراضية حسب ترتيبه (الطرف الأول/الثاني) بدل "الطرف الأول" ثابتة
// للجميع — كان هذا يجعل كل الأطراف تظهر بنفس الصفة افتراضيًا منذ إضافة تهيئة
// طرفين تلقائيًا عند بدء عقد جديد.
function emptyParty(index = 0): DraftParty {
  return {
    party_type: 'individual',
    entity_name: '',
    entity_cr_number: '',
    role_label: index === 1 ? 'الطرف الثاني' : 'الطرف الأول',
    custom_role: '',
    full_name: '',
    national_id: '',
    nationality: NATIONALITIES[0],
    address: '',
    email: '',
    phone: '',
    verification_method: 'manual',
    date_of_birth: '',
    nafathState: 'idle',
    nafathMessage: '',
    randomCode: '',
    is_self: false,
  };
}

// يملأ حقول هوية الطرف من بيانات حساب المستخدم الحالي — يُستخدم عند تفعيل
// مربع اختيار "أضفني كطرف" لأي طرف (وليس الطرف الأول فقط كما كان سابقًا).
function applyProfileToParty(party: DraftParty, profile: Profile): DraftParty {
  return {
    ...party,
    full_name: profile.full_name || party.full_name,
    national_id: profile.national_id || party.national_id,
    nationality: profile.nationality || party.nationality,
    phone: profile.phone || party.phone,
    email: profile.email || party.email,
  };
}

interface PartiesStepProps {
  title: string;
  onTitleChange: (v: string) => void;
  durationDays: string;
  onDurationChange: (v: string) => void;
  documentType: DocumentType;
  poaMode?: boolean;
  // null يعني زائرًا بلا حساب بعد؛ التحقق عبر نفاذ يتطلب إنشاء العقد في القاعدة
  // فورًا، لذا نطلب تسجيل الدخول أولًا بدل محاولة إنشائه لزائر.
  isGuest?: boolean;
  profile?: Profile | null;
  companyName: string;
  onCompanyNameChange: (v: string) => void;
  companyCrNumber: string;
  onCompanyCrNumberChange: (v: string) => void;
  companyLogoDataUrl: string | null;
  onCompanyLogoChange: (v: string | null) => void;
  termMode: TermMode;
  onTermModeChange: (v: TermMode) => void;
  termValue: string;
  onTermValueChange: (v: string) => void;
  termUnit: TermUnit;
  onTermUnitChange: (v: TermUnit) => void;
  termEndDate: string;
  onTermEndDateChange: (v: string) => void;
  parties: DraftParty[];
  onPartiesChange: (parties: DraftParty[]) => void;
  ensureContract: () => Promise<Contract>;
  // غير فارغة إذا اختار المستخدم طريقة التصديق مسبقًا في نافذة الصفحة
  // الرئيسية — عندها تُعرَض الطريقة كشارة للقراءة فقط بدل بطاقتين تفاعليتين،
  // كي لا يُسأل نفس السؤال مرتين لنفس العقد.
  verificationPreset?: VerificationMethod | null;
  onNext: () => void;
}

export function PartiesStep({
  title,
  onTitleChange,
  durationDays,
  onDurationChange,
  documentType,
  poaMode = false,
  isGuest = false,
  profile = null,
  companyName,
  onCompanyNameChange,
  companyCrNumber,
  onCompanyCrNumberChange,
  companyLogoDataUrl,
  onCompanyLogoChange,
  termMode,
  onTermModeChange,
  termValue,
  onTermValueChange,
  termUnit,
  onTermUnitChange,
  termEndDate,
  onTermEndDateChange,
  parties,
  onPartiesChange,
  ensureContract,
  verificationPreset = null,
  onNext,
}: PartiesStepProps) {
  const docLabel = DOCUMENT_TYPE_DEFINITE_LABELS[documentType];
  const [pricing, setPricing] = useState<PricingSettings | null>(null);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showCompany, setShowCompany] = useState(Boolean(companyName || companyCrNumber));
  // بطاقة كل طرف قابلة للطي كي لا تصبح الصفحة طويلة عند وجود أطراف كثيرة —
  // الطرف الأول مفتوح افتراضيًا، والبقية مطوية حتى يُنقر عليها.
  const [openIndexes, setOpenIndexes] = useState<Set<number>>(() => new Set([0]));
  const toggleOpen = (index: number) => {
    setOpenIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  useEffect(() => {
    fetchPricingSettings()
      .then(setPricing)
      .catch(() => setPricing(null));
  }, []);

  const updateParty = (index: number, patch: Partial<DraftParty>) => {
    const next = parties.map((p, i) => (i === index ? { ...p, ...patch } : p));
    onPartiesChange(next);
  };

  // تفعيل/إلغاء "أضفني كطرف" لهذا الطرف: عند التفعيل تُملأ حقول هويته من بيانات
  // الحساب الحالي وتُقفَل، ويُلغى تفعيلها تلقائيًا عن أي طرف آخر (طرف واحد فقط
  // يمكن أن يمثّل صاحب الحساب). عند الإلغاء تبقى البيانات كما هي لكن تصبح قابلة للتعديل.
  const toggleSelf = (index: number) => {
    const next = parties.map((p, i) => {
      if (i === index) {
        const nowSelf = !p.is_self;
        return nowSelf && profile ? applyProfileToParty({ ...p, is_self: true }, profile) : { ...p, is_self: nowSelf };
      }
      return p.is_self ? { ...p, is_self: false } : p;
    });
    onPartiesChange(next);
  };

  const addParty = () => {
    const next = emptyParty(parties.length);
    // طرف جديد يُضاف بعد اختيار طريقة تصديق مسبقة (verificationPreset) يرث نفس
    // الطريقة تلقائيًا بدل الافتراضي "يدوي" — كي يطابق ما تعرضه الشارة للقراءة فقط.
    onPartiesChange([...parties, verificationPreset ? { ...next, verification_method: verificationPreset } : next]);
    setOpenIndexes((prev) => new Set(prev).add(parties.length));
  };
  const removeParty = (index: number) => onPartiesChange(parties.filter((_, i) => i !== index));

  const startNafathVerification = async (index: number) => {
    const party = parties[index];
    if (isGuest) {
      updateParty(index, { nafathState: 'error', nafathMessage: 'سجّل الدخول أو أنشئ حسابًا أولًا لاستخدام التحقق عبر نفاذ' });
      return;
    }
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
    setFieldErrors({});
    if (!title.trim()) {
      setError(`عنوان ${docLabel} مطلوب`);
      return;
    }
    const duration = Number(durationDays);
    if (!durationDays.trim() || !Number.isInteger(duration) || duration < 1 || duration > 14) {
      setError('حدد صلاحية التوثيق كعدد صحيح من الأيام بين 1 و14');
      return;
    }
    if (poaMode) {
      if (parties.length !== 1) {
        setError('لا يمكن أن يتضمن التفويض أكثر من طرف واحد');
        return;
      }
    } else if (parties.length < 2) {
      setError('يلزم طرفان على الأقل لإنشاء عقد');
      return;
    }
    // تُجمع كل أخطاء الحقول الفارغة دفعة واحدة كي تظهر بجانب كل حقل ناقص مباشرةً
    // (بدل التوقف عند أول خطأ وعرض رسالة عامة أسفل الصفحة فقط).
    const errors: Record<string, string> = {};
    let firstInvalidIndex: number | null = null;
    const markInvalid = (index: number, key: string, message: string) => {
      errors[`${index}.${key}`] = message;
      if (firstInvalidIndex === null) firstInvalidIndex = index;
    };
    parties.forEach((p, index) => {
      if (p.party_type === 'entity' && !p.entity_name.trim()) {
        markInvalid(index, 'entity_name', 'اسم المنشأة مطلوب');
      }
      if (!p.full_name.trim()) {
        markInvalid(index, 'full_name', p.party_type === 'entity' ? 'اسم ممثل المنشأة مطلوب' : 'الاسم مطلوب');
      }
      if (p.role_label === 'أخرى' && !p.custom_role.trim()) {
        markInvalid(index, 'custom_role', 'حدد مسمّى الصفة');
      }
    });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('أكمل الحقول المطلوبة المُعلَّمة أدناه');
      if (firstInvalidIndex !== null) setOpenIndexes((prev) => new Set(prev).add(firstInvalidIndex as number));
      return;
    }
    const duplicate = findDuplicateNationalId(parties.map((p) => p.national_id));
    if (duplicate) {
      setError(`رقم الهوية مكرر بين الطرف ${duplicate.firstIndex + 1} والطرف ${duplicate.secondIndex + 1} — لا يمكن أن يتطابق رقم الهوية بين طرفين مختلفين`);
      setOpenIndexes((prev) => new Set(prev).add(duplicate.firstIndex).add(duplicate.secondIndex));
      return;
    }
    onNext();
  };

  const invoice = pricing ? calculateInvoice(parties.length, pricing) : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={`عنوان ${docLabel}`} value={title} onChange={onTitleChange} required />
        {poaMode ? (
          <div className="block text-sm">
            <span className="mb-1.5 block text-xs font-bold text-slate">صلاحية التوثيق (أيام)</span>
            <p className="rounded-lg border border-line bg-paper px-3 py-2.5 text-ink">7 أيام (تلقائيًا للتفويض)</p>
          </div>
        ) : (
          <label className="block text-sm">
            <span className="mb-1.5 block text-xs font-bold text-slate">صلاحية التوثيق (أيام)</span>
            <select
              value={durationDays}
              onChange={(e) => onDurationChange(e.target.value)}
              required
              className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-ink outline-none focus:border-seal"
            >
              {Array.from({ length: 14 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={String(day)}>
                  {day} {day === 1 ? 'يوم' : 'أيام'}
                </option>
              ))}
            </select>
            <span className="mt-1.5 block text-xs text-slate">المدة التي تبقى فيها روابط التوقيع صالحة، بين يوم و14 يومًا (الافتراضي 3 أيام)</span>
          </label>
        )}
        <div className="block text-sm">
          <span className="mb-1.5 block text-xs font-bold text-slate">نوع الوثيقة</span>
          <p className="rounded-lg border border-line bg-paper px-3 py-2.5 text-ink">{DOCUMENT_TYPE_LABELS[documentType]}</p>
        </div>
      </div>

      {!poaMode && (
        <div className="rounded-xl border border-line bg-card p-4">
          {!showCompany ? (
            <button type="button" onClick={() => setShowCompany(true)} className="text-sm font-bold text-seal">
              + إرفاق بيانات منشأة صادرة عنها العقد (اختياري)
            </button>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="اسم المنشأة (اختياري)" value={companyName} onChange={onCompanyNameChange} />
                <Field
                  label="رقم السجل التجاري (اختياري)"
                  value={companyCrNumber}
                  onChange={onCompanyCrNumberChange}
                  digitsOnly
                  maxLength={10}
                  hint="10 أرقام فقط"
                />
              </div>
              <div className="flex items-center gap-3">
                {companyLogoDataUrl ? (
                  <img src={companyLogoDataUrl} alt="شعار المنشأة" className="h-14 w-14 rounded-lg border border-line bg-white object-contain p-1" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-line text-[10px] text-slate">لا يوجد</div>
                )}
                <div className="flex-1">
                  <label className="text-xs font-bold text-seal">
                    رفع شعار المنشأة (اختياري) — يظهر بارزًا في كل صفحات {docLabel} النهائي
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) onCompanyLogoChange(await fileToDataUrl(file));
                      }}
                      className="mt-1.5 block w-full text-xs"
                    />
                  </label>
                  {companyLogoDataUrl && (
                    <button type="button" onClick={() => onCompanyLogoChange(null)} className="mt-1 text-xs font-bold text-clay">
                      إزالة الشعار
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-line bg-card p-4">
        {termMode === 'none' ? (
          <button type="button" onClick={() => onTermModeChange('duration')} className="text-sm font-bold text-seal">
            + تحديد مدة سريان {docLabel} (اختياري)
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate">مدة سريان {docLabel}</span>
              <button type="button" onClick={() => onTermModeChange('none')} className="text-xs font-bold text-clay">
                إزالة
              </button>
            </div>
            <div className="flex gap-1.5 rounded-lg bg-paper p-1">
              <button
                type="button"
                onClick={() => onTermModeChange('duration')}
                className={`flex-1 rounded-md py-1.5 text-xs font-bold transition ${termMode === 'duration' ? 'bg-card text-ink shadow-sm' : 'text-slate'}`}
              >
                مدة
              </button>
              <button
                type="button"
                onClick={() => onTermModeChange('date')}
                className={`flex-1 rounded-md py-1.5 text-xs font-bold transition ${termMode === 'date' ? 'bg-card text-ink shadow-sm' : 'text-slate'}`}
              >
                تاريخ محدد
              </button>
            </div>
            {termMode === 'duration' ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="القيمة" value={termValue} onChange={onTermValueChange} type="number" min={1} placeholder="مثال: 12" />
                <label className="block text-sm">
                  <span className="mb-1 block font-bold text-ink">الوحدة</span>
                  <select
                    value={termUnit}
                    onChange={(e) => onTermUnitChange(e.target.value as TermUnit)}
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-seal"
                  >
                    {Object.entries(TERM_UNIT_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : (
              <div>
                <span className="mb-1 block text-sm font-bold text-ink">تاريخ انتهاء {docLabel}</span>
                <GregorianDateInput value={termEndDate} onChange={onTermEndDateChange} />
              </div>
            )}
          </div>
        )}
      </div>

      {invoice !== null && (
        <div className="rounded-xl border border-line bg-paper p-4 text-center">
          <p className="text-xs font-bold text-slate">الرسوم المتوقعة لعدد الأطراف الحالي ({parties.length})</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-seal">
            {invoice.toFixed(2)} <span className="text-sm font-bold text-slate">ريال</span>
          </p>
          <p className="mt-1 text-xs text-slate">يمكن تطبيق كود خصم عند الدفع في خطوة المراجعة والإرسال</p>
        </div>
      )}

      <div className="space-y-3">
        {parties.map((party, index) => {
          // الطرف الذي فعّل "أضفني كطرف" يمثّل صاحب الحساب نفسه: هويته وجنسيته
          // ثابتة من بيانات حسابه المُتحقَّق منها بصرف النظر عن الصفة المختارة له
          // (بائع، مشترٍ...) أو تحوّله لتمثيل منشأة. في التفويض الطرف الوحيد هو
          // المفوَّض (شخص آخر يُمنح الصلاحية)، فلا يُقفَل. الزائر بلا حساب بعد لا
          // توجد له بيانات ليُقفَل عليها، فتبقى حقوله قابلة للتعديل كسابقًا حتى يسجّل الدخول.
          const isPartyLocked = party.is_self && !poaMode && !isGuest;
          const isOpen = openIndexes.has(index);
          const summary = party.full_name.trim() || (party.party_type === 'entity' ? party.entity_name.trim() : '') || 'غير مكتمل';
          return (
          <div key={index} className="rounded-xl border border-line bg-card">
            <button
              type="button"
              onClick={() => toggleOpen(index)}
              className="flex w-full items-center justify-between gap-2 p-4 text-start"
            >
              <div className="flex items-center gap-2">
                <ChevronDown size={16} className={`shrink-0 text-sealMuted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                <div>
                  <p className="font-display text-sm font-bold text-ink">{poaMode ? 'بيانات المفوَّض' : `الطرف ${index + 1}`}</p>
                  {!isOpen && <p className="mt-0.5 text-xs text-slate">{summary}</p>}
                </div>
                {party.is_self && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sealLight px-2 py-0.5 text-[11px] font-bold text-seal">
                    <UserCheck size={12} /> أنت
                  </span>
                )}
              </div>
              {!poaMode && parties.length > 1 && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeParty(index);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      removeParty(index);
                    }
                  }}
                  className="rounded-lg p-1.5 text-clay hover:bg-clayLight"
                >
                  <Trash2 size={16} />
                </span>
              )}
            </button>

            {isOpen && (
              <div className="border-t border-line p-4 pt-3">
                {!poaMode && !isGuest && profile && (
                  <label className="mb-3 flex items-center gap-2 rounded-lg bg-paper p-2.5 text-sm font-bold text-ink">
                    <input type="checkbox" checked={party.is_self} onChange={() => toggleSelf(index)} className="h-4 w-4 accent-seal" />
                    أضفني كهذا الطرف (تُملأ بياناتي تلقائيًا من حسابي)
                  </label>
                )}

                {!poaMode && (
                  <>
                    <div className="mb-3 flex gap-1.5 rounded-lg bg-paper p-1">
                      <button
                        type="button"
                        onClick={() => updateParty(index, { party_type: 'individual' })}
                        className={`flex-1 rounded-md py-1.5 text-xs font-bold transition ${
                          party.party_type === 'individual' ? 'bg-card text-ink shadow-sm' : 'text-sealMuted'
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
                          party.party_type === 'entity' ? 'bg-card text-ink shadow-sm' : 'text-sealMuted'
                        }`}
                      >
                        <span className="flex items-center justify-center gap-1">
                          <Building2 size={13} /> منشأة
                        </span>
                      </button>
                    </div>

                    {party.party_type === 'entity' && (
                      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field
                          label="اسم المنشأة"
                          value={party.entity_name}
                          onChange={(v) => updateParty(index, { entity_name: v })}
                          required
                          error={fieldErrors[`${index}.entity_name`]}
                        />
                        <Field
                          label="رقم السجل التجاري"
                          value={party.entity_cr_number}
                          onChange={(v) => updateParty(index, { entity_cr_number: v })}
                          digitsOnly
                          maxLength={10}
                          hint="10 أرقام فقط"
                        />
                      </div>
                    )}
                  </>
                )}

                {/* طريقة إثبات الهوية: إن اختارها المستخدم مسبقًا في نافذة الصفحة الرئيسية
                    (verificationPreset) تُعرض كشارة للقراءة فقط بدل إعادة السؤال؛ وإلا
                    تُعرض كبطاقتين بارزتين تفاعليتين ليكون الفرق بين الإدخال اليدوي
                    والتحقق الرسمي عبر نفاذ واضحًا للمستخدم. */}
                {verificationPreset ? (
                  <div className="mb-3 flex items-center gap-2 rounded-lg bg-paper p-2.5 text-sm font-bold text-ink">
                    {verificationPreset === 'nafath' ? <ShieldCheck size={16} className="text-seal" /> : <User size={16} className="text-seal" />}
                    طريقة التصديق: {verificationPreset === 'nafath' ? 'تحقق عبر نفاذ' : 'إدخال يدوي'}
                    <span className="text-xs font-normal text-slate">(اختِيرت مسبقًا)</span>
                  </div>
                ) : (
                  <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => updateParty(index, { verification_method: 'manual' })}
                      className={`flex items-center gap-2 rounded-xl border-2 p-3 text-start transition ${
                        party.verification_method === 'manual' ? 'border-seal bg-sealLight' : 'border-line bg-card hover:border-sealMuted'
                      }`}
                    >
                      <User size={18} className={party.verification_method === 'manual' ? 'text-seal' : 'text-sealMuted'} />
                      <span>
                        <span className="block text-sm font-bold text-ink">إدخال يدوي</span>
                        <span className="block text-[11px] text-slate">إدخال البيانات مباشرة بلا تحقق رسمي</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateParty(index, { verification_method: 'nafath' })}
                      className={`flex items-center gap-2 rounded-xl border-2 p-3 text-start transition ${
                        party.verification_method === 'nafath' ? 'border-seal bg-sealLight' : 'border-line bg-card hover:border-sealMuted'
                      }`}
                    >
                      <ShieldCheck size={18} className={party.verification_method === 'nafath' ? 'text-seal' : 'text-sealMuted'} />
                      <span>
                        <span className="block text-sm font-bold text-ink">تحقق عبر نفاذ</span>
                        <span className="block text-[11px] text-slate">تحقق رسمي من الهوية عبر تطبيق نفاذ</span>
                      </span>
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {!poaMode && (
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
                  )}
                  {!poaMode && party.role_label === 'أخرى' && (
                    <Field
                      label="مسمّى الصفة"
                      value={party.custom_role}
                      onChange={(v) => updateParty(index, { custom_role: v })}
                      required
                      error={fieldErrors[`${index}.custom_role`]}
                    />
                  )}

                  {party.verification_method === 'nafath' && (
                    <>
                      <Field
                        label={
                          poaMode
                            ? 'رقم هوية المفوَّض (10 أرقام)'
                            : isPartyLocked
                              ? 'رقم الهوية أو الإقامة (بيانات حسابك، غير قابلة للتعديل)'
                              : 'رقم الهوية أو الإقامة (10 أرقام)'
                        }
                        value={party.national_id}
                        onChange={(v) => updateParty(index, { national_id: v })}
                        required
                        digitsOnly
                        maxLength={10}
                        disabled={isPartyLocked}
                      />
                      <Field label="تاريخ الميلاد" value={party.date_of_birth} onChange={(v) => updateParty(index, { date_of_birth: v })} type="date" required />
                    </>
                  )}

                  <Field
                    label={
                      poaMode
                        ? 'اسم المفوَّض'
                        : isPartyLocked
                          ? party.party_type === 'entity'
                            ? 'اسم الممثل (بيانات حسابك، غير قابلة للتعديل)'
                            : 'الاسم (بيانات حسابك، غير قابلة للتعديل)'
                          : party.party_type === 'entity'
                            ? 'اسم الممثل'
                            : party.verification_method === 'nafath'
                              ? 'الاسم (يُملأ تلقائيًا بعد التحقق، أو أدخله مؤقتًا)'
                              : 'الاسم'
                    }
                    value={party.full_name}
                    onChange={(v) => updateParty(index, { full_name: v })}
                    required
                    disabled={isPartyLocked}
                    error={fieldErrors[`${index}.full_name`]}
                  />
                  {party.verification_method === 'manual' && (
                    <Field
                      label={
                        poaMode
                          ? 'رقم هوية المفوَّض'
                          : isPartyLocked
                            ? 'رقم الهوية أو الإقامة (بيانات حسابك، غير قابلة للتعديل)'
                            : 'رقم الهوية أو الإقامة'
                      }
                      value={party.national_id}
                      onChange={(v) => updateParty(index, { national_id: v })}
                      digitsOnly
                      maxLength={10}
                      hint="10 أرقام فقط"
                      disabled={isPartyLocked}
                    />
                  )}
                  <label className="block text-sm">
                    <span className="mb-1 block font-bold text-ink">
                      {poaMode ? 'جنسية المفوَّض' : isPartyLocked ? 'الجنسية (بيانات حسابك، غير قابلة للتعديل)' : 'الجنسية'}
                    </span>
                    <select
                      value={party.nationality}
                      onChange={(e) => updateParty(index, { nationality: e.target.value })}
                      disabled={isPartyLocked}
                      className="w-full rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-seal disabled:cursor-not-allowed disabled:bg-paper disabled:text-slate"
                    >
                      {NATIONALITIES.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!poaMode && (
                    <>
                      <Field label="العنوان" value={party.address} onChange={(v) => updateParty(index, { address: v })} />
                      <Field label="البريد الإلكتروني" value={party.email} onChange={(v) => updateParty(index, { email: v })} type="email" />
                      <Field label="رقم الجوال" value={party.phone} onChange={(v) => updateParty(index, { phone: v })} phone />
                    </>
                  )}
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
            )}
          </div>
          );
        })}
      </div>

      {!poaMode && (
        <Button variant="secondary" onClick={addParty}>
          <span className="flex items-center gap-1.5">
            <Plus size={16} /> إضافة طرف
          </span>
        </Button>
      )}

      {error && <p className="text-sm font-bold text-clay">{error}</p>}

      <div className="flex justify-end">
        <Button onClick={submit}>التالي: طريقة إنشاء {docLabel}</Button>
      </div>
    </div>
  );
}

export { emptyParty };
