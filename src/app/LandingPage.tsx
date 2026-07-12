import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '@/features/auth/hooks/useSession';
import { signOut } from '@/features/auth/api/authApi';
import type { Profile } from '@/features/auth/types';
import {
  FileSignature,
  ShieldCheck,
  Users,
  Zap,
  Lock,
  ScanLine,
  PenTool,
  ListChecks,
  X,
  LogIn,
  UserPlus,
  ArrowLeft,
  ArrowRight,
  Search,
  Stamp,
  Globe,
  Mail,
} from 'lucide-react';
import { fetchPricingSettings, calculateInvoice, type PricingSettings } from '@/features/contracts/api/pricingApi';
import { previewDiscountCode, type DiscountPreview } from '@/features/contracts/api/discountCodesApi';
import { redeemCreditCode } from '@/features/contracts/api/creditCodesApi';
import { setPendingContractIntent } from '@/features/contracts/lib/pendingIntent';
import type { DocumentType, VerificationMethod } from '@/features/contracts/types';
import { fetchSiteSettings, type SiteSettings } from '@/features/site/api/siteSettingsApi';
import { WhatsAppButton } from '@/shared/ui/WhatsAppButton';

const DEFAULT_ORG_NAME = 'منصة إقرار لخدمات الأعمال';

const FEATURES = [
  {
    icon: ListChecks,
    title: 'تتبع العقود',
    desc: 'تابع حالة كل عقد وطرف لحظة بلحظة — بانتظار، تم التوقيع، أو اكتمل التوثيق بالكامل.',
  },
  {
    icon: Users,
    title: 'أطراف متعددون',
    desc: 'أضف أي عدد من الأطراف، أفرادًا أو منشآت، وحدد أدوارهم حتى اكتمال التوثيق.',
  },
  {
    icon: Lock,
    title: 'أمان وخصوصية',
    desc: 'بياناتك ومستنداتك محمية بصلاحيات دقيقة، وكل عقد مُوثّق برقم توثيق فريد.',
  },
  {
    icon: Zap,
    title: 'إرسال فوري',
    desc: 'أرسل العقد لأطرافه برابط فريد للتوقيع الإلكتروني دون تعقيد أو تنزيل برامج.',
  },
  {
    icon: ScanLine,
    title: 'مستند نهائي معتمد',
    desc: 'احصل على نسخة نهائية موقّعة برقم توثيق ورمز QR يُمكن مسحه للتأكد من صحة الوثيقة.',
  },
  {
    icon: Search,
    title: 'التحقق من الوثائق',
    desc: 'تحقق من صحة أي عقد موثّق عبر رقم التوثيق أو رمز QR الموجود عليه في أي وقت.',
  },
];

const VERIFICATION_TYPES = [
  {
    icon: ShieldCheck,
    title: 'توقيع عبر نفاذ',
    badge: 'قريبًا',
    desc: 'تحقق رسمي من هوية الطرف عبر منصة نفاذ الوطنية، مناسب للعقود التي تتطلب أعلى درجات التوثيق.',
    details:
      'يتحقق الطرف من هويته مباشرة عبر منصة نفاذ الوطنية بخطوتين بسيطتين من جواله، دون الحاجة لإدخال بيانات يدويًا. ' +
      'يمنحك هذا أعلى مستوى ثقة قانونية لأن الهوية مؤكدة رسميًا من الجهات الحكومية. ' +
      'مناسب للعقود ذات القيمة العالية أو التي تتطلب إثباتًا رسميًا قويًا للهوية.',
  },
  {
    icon: PenTool,
    title: 'توقيع إلكتروني',
    badge: null,
    desc: 'توقيع إلكتروني مباشر بخط اليد داخل المتصفح، مناسب للإقرارات والاتفاقيات الأسرع والأبسط.',
    details:
      'يوقّع الطرف بخط يده مباشرة على الشاشة دون تثبيت أي برنامج أو تطبيق إضافي. ' +
      'أسرع طريقة لإتمام التوثيق، ومناسبة للإقرارات والاتفاقيات البسيطة التي لا تستلزم تحقق هوية حكومي. ' +
      'يبقى المستند موقّعًا ومحفوظًا برقم توثيق ورمز QR كأي عقد آخر على المنصة.',
  },
];

const TRUST_POINTS = [
  { icon: ShieldCheck, label: 'تحقق هوية عبر نفاذ الوطنية (قريبًا)' },
  { icon: Lock, label: 'حماية وتشفير لبيانات كل عقد' },
  { icon: ScanLine, label: 'رقم توثيق ورمز QR على كل مستند' },
];

function Nav({ profile, onLogout, orgName, logoUrl }: { profile: Profile | null; onLogout: () => void; orgName: string; logoUrl: string | null }) {
  return (
    <header className="border-b border-line bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-8">
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            <img src={logoUrl} alt={orgName} className="h-9 w-9 rounded-md object-contain" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-seal">
              <FileSignature size={18} className="text-white" />
            </div>
          )}
          <span className="font-display text-lg font-extrabold text-ink">
            <span className="sm:hidden">إقرار</span>
            <span className="hidden sm:inline">{orgName}</span>
          </span>
        </div>
        <div className="flex items-center gap-0.5 text-xs font-bold sm:gap-1 sm:text-sm">
          {!profile && (
            <Link to="/verify" className="hidden items-center gap-1.5 px-3 py-2 text-ink hover:text-seal sm:flex">
              <ShieldCheck size={16} /> التحقق من وثيقة
            </Link>
          )}
          {profile ? (
            <>
              <span className="hidden px-3 py-2 text-ink sm:inline">أهلاً بك يا {profile.full_name || profile.email}</span>
              <Link
                to="/app"
                className="whitespace-nowrap rounded-md bg-seal px-3 py-2 text-sm font-extrabold text-white shadow-sm hover:opacity-90 sm:px-5 sm:py-2.5 sm:text-base"
              >
                حسابي
              </Link>
              <button type="button" onClick={onLogout} className="whitespace-nowrap px-2 py-2 text-ink hover:text-seal sm:px-3">
                تسجيل الخروج
              </button>
            </>
          ) : (
            <>
              <Link to="/login?return=/" className="whitespace-nowrap px-2 py-2 text-ink hover:text-seal sm:px-3">
                تسجيل الدخول
              </Link>
              <Link to="/register" className="whitespace-nowrap rounded-md bg-seal px-3 py-2 text-white hover:opacity-90 sm:px-5">
                إنشاء حساب
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// نافذة الدخول لبدء عقد أو تفويض: 1) عدد الأطراف (للعقد فقط) والسعر المتوقع،
// 2) طريقة التصديق الافتراضية (للعقد فقط)، 3) تسجيل الدخول/إنشاء حساب/الاستمرار
// كضيف. يُحفَظ الاختيار عبر sessionStorage (setPendingContractIntent) ليقرأه معالج
// إنشاء العقد بعد أي من المسارات الثلاثة، بما فيها إعادة التوجيه بعد تسجيل الدخول.
const PARTY_COUNT_OPTIONS = Array.from({ length: 19 }, (_, i) => i + 2);

function CreateEntryFlow({ documentType, onClose }: { documentType: DocumentType; onClose: () => void }) {
  const isPoa = documentType === 'power_of_attorney';
  const navigate = useNavigate();
  const { profile } = useSession();
  const [step, setStep] = useState<'count' | 'method' | 'auth'>('count');
  const [partyCountInput, setPartyCountInput] = useState('2');
  const [partyCountMode, setPartyCountMode] = useState<'select' | 'custom'>('select');
  const [pricing, setPricing] = useState<PricingSettings | null>(null);
  const [verificationDefault, setVerificationDefault] = useState<VerificationMethod>('nafath');
  const [error, setError] = useState('');

  const [discountCode, setDiscountCode] = useState('');
  const [discountPreview, setDiscountPreview] = useState<DiscountPreview | null>(null);
  const [checkingDiscount, setCheckingDiscount] = useState(false);

  const [creditCode, setCreditCode] = useState('');
  const [creditResult, setCreditResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [redeemingCredit, setRedeemingCredit] = useState(false);

  useEffect(() => {
    fetchPricingSettings()
      .then(setPricing)
      .catch(() => setPricing(null));
  }, []);

  const partyCount = isPoa ? 1 : Math.max(0, Math.floor(Number(partyCountInput) || 0));
  const price = pricing ? calculateInvoice(partyCount, pricing) : null;
  const title = isPoa ? 'إنشاء تفويض' : 'إنشاء عقد';

  const applyDiscountCode = async () => {
    if (!discountCode.trim()) return;
    setCheckingDiscount(true);
    setDiscountPreview(null);
    try {
      setDiscountPreview(await previewDiscountCode(discountCode.trim(), partyCount));
    } catch (err) {
      setDiscountPreview({
        discount_code_id: null,
        discount_percent: null,
        base_amount: 0,
        final_amount: 0,
        message: err instanceof Error ? err.message : 'تعذّر التحقق من الكود',
      });
    } finally {
      setCheckingDiscount(false);
    }
  };

  const applyCreditCode = async () => {
    if (!creditCode.trim()) return;
    setRedeemingCredit(true);
    setCreditResult(null);
    try {
      const added = await redeemCreditCode(creditCode.trim());
      setCreditResult({ ok: true, message: `تم شحن رصيدك بمبلغ ${added.toFixed(2)} ريال` });
      setCreditCode('');
    } catch (err) {
      setCreditResult({ ok: false, message: err instanceof Error ? err.message : 'تعذّر استخدام الكود' });
    } finally {
      setRedeemingCredit(false);
    }
  };

  // يُنهي نافذة الدخول: يحفظ نية الإنشاء (عدد الأطراف، طريقة التصديق، وكود
  // الخصم إن طُبِّق بنجاح) ثم إما يذهب مباشرة لمعالج إنشاء العقد إن كان
  // المستخدم مسجَّل دخوله بالفعل (بدل سؤاله تسجيل الدخول مجددًا وهو مسجَّل)،
  // أو يعرض خطوة الدخول/التسجيل/الاستمرار كضيف كما كان.
  const proceedToWizard = (verification: VerificationMethod) => {
    setPendingContractIntent({
      documentType,
      partyCount,
      verificationDefault: verification,
      discountCode: discountPreview?.discount_code_id ? discountCode.trim() : undefined,
    });
    if (profile) {
      navigate('/app/contracts/new');
    } else {
      setStep('auth');
    }
  };

  const confirmCount = () => {
    if (!isPoa && (!partyCountInput.trim() || partyCount < 2)) {
      setError('أدخل عدد أطراف العقد (طرفان على الأقل)');
      return;
    }
    setError('');
    if (isPoa) {
      proceedToWizard('manual');
    } else {
      setStep('method');
    }
  };

  const confirmMethod = () => proceedToWizard(verificationDefault);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4" dir="rtl" onClick={onClose}>
      <div className="relative w-full max-w-sm rounded-md border border-line bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="إغلاق" className="absolute left-4 top-4 text-slate hover:text-ink">
          <X size={20} />
        </button>
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-md bg-sealLight">
            {isPoa ? <Stamp size={22} className="text-seal" /> : <FileSignature size={22} className="text-seal" />}
          </div>
          <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
        </div>

        {step === 'count' && (
          <div className="space-y-4">
            {!isPoa ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate">كم عدد أطراف العقد؟</label>
                  <select
                    value={partyCountMode === 'custom' ? 'custom' : partyCountInput}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setPartyCountMode('custom');
                        setPartyCountInput('');
                      } else {
                        setPartyCountMode('select');
                        setPartyCountInput(e.target.value);
                      }
                    }}
                    className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-center text-ink outline-none focus:border-seal"
                  >
                    {PARTY_COUNT_OPTIONS.map((n) => (
                      <option key={n} value={String(n)}>
                        {n}
                      </option>
                    ))}
                    <option value="custom">أخرى</option>
                  </select>
                  {partyCountMode === 'custom' && (
                    <input
                      type="number"
                      min={2}
                      inputMode="numeric"
                      autoFocus
                      value={partyCountInput}
                      onChange={(e) => setPartyCountInput(e.target.value)}
                      placeholder="أدخل العدد"
                      className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-center text-ink outline-none focus:border-seal"
                    />
                  )}
                </div>
                {price !== null && (
                  <div className="rounded-xl border border-line bg-paper p-4 text-center">
                    <p className="text-xs font-bold text-slate">التكلفة المتوقعة للتوثيق</p>
                    {discountPreview?.discount_code_id ? (
                      <p className="mt-1 font-display text-xl font-extrabold text-seal">
                        <span className="ms-1 block text-xs font-bold text-slate line-through">{price.toFixed(2)}</span>
                        {discountPreview.final_amount.toFixed(2)} <span className="text-xs font-bold text-slate">ريال</span>
                      </p>
                    ) : (
                      <p className="mt-1 font-display text-xl font-extrabold text-seal">
                        {price.toFixed(2)} <span className="text-xs font-bold text-slate">ريال</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              price !== null && (
                <div className="rounded-xl border border-line bg-paper p-4 text-center">
                  <p className="text-xs font-bold text-slate">سعر الخدمة المتوقع</p>
                  <p className="mt-1 font-display text-2xl font-extrabold text-seal">
                    {price.toFixed(2)} <span className="text-sm font-bold text-slate">ريال سعودي</span>
                  </p>
                </div>
              )
            )}

            <div className="rounded-xl border border-line bg-card p-3">
              <p className="mb-2 text-xs font-bold text-ink">كود الخصم (اختياري)</p>
              <div className="flex gap-2">
                <input
                  value={discountCode}
                  onChange={(e) => {
                    setDiscountCode(e.target.value);
                    setDiscountPreview(null);
                  }}
                  placeholder="أدخل الكود"
                  className="flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-seal"
                />
                <button
                  type="button"
                  onClick={applyDiscountCode}
                  disabled={checkingDiscount || !discountCode.trim()}
                  className="shrink-0 rounded-lg bg-seal px-3 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {checkingDiscount ? 'جارِ التحقق...' : 'طبّق'}
                </button>
              </div>
              {discountPreview && (
                <p className={`mt-1.5 text-xs font-bold ${discountPreview.discount_code_id ? 'text-sage' : 'text-clay'}`}>
                  {discountPreview.discount_code_id ? `تم تطبيق الكود: خصم ${discountPreview.discount_percent}%` : discountPreview.message}
                </p>
              )}
            </div>

            {profile && (
              <div className="rounded-xl border border-line bg-card p-3">
                <p className="mb-2 text-xs font-bold text-ink">استخدام كود الشحن (اختياري)</p>
                <div className="flex gap-2">
                  <input
                    value={creditCode}
                    onChange={(e) => {
                      setCreditCode(e.target.value);
                      setCreditResult(null);
                    }}
                    placeholder="أدخل الكود"
                    className="flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-seal"
                  />
                  <button
                    type="button"
                    onClick={applyCreditCode}
                    disabled={redeemingCredit || !creditCode.trim()}
                    className="shrink-0 rounded-lg bg-seal px-3 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {redeemingCredit ? 'جارِ الشحن...' : 'طبّق'}
                  </button>
                </div>
                {creditResult && (
                  <p className={`mt-1.5 text-xs font-bold ${creditResult.ok ? 'text-sage' : 'text-clay'}`}>{creditResult.message}</p>
                )}
              </div>
            )}

            {error && <p className="text-sm font-bold text-clay">{error}</p>}
            <button
              type="button"
              onClick={confirmCount}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-seal px-4 py-3 text-sm font-bold text-white hover:opacity-90"
            >
              موافق <ArrowRight size={16} />
            </button>
          </div>
        )}

        {step === 'method' && (
          <div className="space-y-3">
            <p className="text-center text-sm text-slate">اختر طريقة التصديق</p>
            <button
              type="button"
              onClick={() => setVerificationDefault('nafath')}
              className={`flex w-full items-center gap-2 rounded-md border px-4 py-3 text-sm font-bold ${
                verificationDefault === 'nafath' ? 'border-seal bg-sealLight text-seal' : 'border-line text-ink hover:bg-paper'
              }`}
            >
              <ShieldCheck size={16} /> تصديق إلكتروني عبر نفاذ (قريبًا)
            </button>
            <button
              type="button"
              onClick={() => setVerificationDefault('manual')}
              className={`flex w-full items-center gap-2 rounded-md border px-4 py-3 text-sm font-bold ${
                verificationDefault === 'manual' ? 'border-seal bg-sealLight text-seal' : 'border-line text-ink hover:bg-paper'
              }`}
            >
              <PenTool size={16} /> توقيع إلكتروني عبر منصة إقرار
            </button>
            <button type="button" onClick={confirmMethod} className="w-full rounded-md bg-seal px-4 py-3 text-sm font-bold text-white hover:opacity-90">
              متابعة
            </button>
          </div>
        )}

        {step === 'auth' && (
          <div className="space-y-2">
            <p className="mb-3 text-center text-sm text-slate">كيف تريد المتابعة؟</p>
            <Link
              to="/login?return=/app/contracts/new"
              className="flex items-center gap-2 rounded-md border border-line px-4 py-3 text-sm font-bold text-ink hover:bg-paper"
            >
              <LogIn size={16} /> تسجيل الدخول
            </Link>
            <Link
              to="/register?return=/app/contracts/new"
              className="flex items-center gap-2 rounded-md bg-seal px-4 py-3 text-sm font-bold text-white hover:opacity-90"
            >
              <UserPlus size={16} /> إنشاء حساب
            </Link>
            <Link
              to="/app/contracts/new"
              className="flex items-center gap-2 rounded-md px-4 py-3 text-sm font-bold text-seal hover:bg-sealLight"
            >
              <ArrowLeft size={16} /> استمرار كضيف
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionEyebrow({ children }: { children: string }) {
  return (
    <p className="mb-2 inline-block border-b-2 border-seal pb-1 text-xs font-bold tracking-wide text-seal">
      {children}
    </p>
  );
}

function QuickVerify() {
  const [number, setNumber] = useState('');
  const navigate = useNavigate();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = number.trim();
    navigate(trimmed ? `/verify?number=${encodeURIComponent(trimmed)}` : '/verify');
  };

  return (
    <section className="border-t border-line bg-paper">
      <div className="mx-auto max-w-6xl px-4 py-14 md:px-8">
        <div className="mx-auto max-w-2xl rounded-md border border-line bg-card p-6 md:p-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-sealLight">
              <Search size={20} className="text-seal" />
            </div>
            <div>
              <h2 className="font-display text-lg font-extrabold text-ink">التحقق من العقود الموثّقة</h2>
              <p className="text-sm text-slate">أدخل رقم التوثيق للتأكد من صحة المستند وأطرافه.</p>
            </div>
          </div>
          <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              inputMode="numeric"
              dir="ltr"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="رقم التوثيق (10 أرقام)"
              className="w-full flex-1 rounded-md border border-line bg-paper px-4 py-3 text-center text-sm font-bold text-ink placeholder:text-slate/70 focus:border-seal focus:outline-none"
            />
            <button type="submit" className="rounded-md bg-seal px-8 py-3 text-sm font-bold text-white hover:opacity-90">
              تحقق الآن
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

export function LandingPage() {
  const [activeFlow, setActiveFlow] = useState<DocumentType | null>(null);
  const [expandedVerification, setExpandedVerification] = useState<string | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const { profile, refresh } = useSession();

  useEffect(() => {
    fetchSiteSettings()
      .then(setSiteSettings)
      .catch(() => setSiteSettings(null));
  }, []);

  const orgName = siteSettings?.org_name || DEFAULT_ORG_NAME;
  const logoUrl = siteSettings?.logo_data_url ?? null;

  const handleLogout = async () => {
    await signOut();
    await refresh();
  };

  return (
    <div dir="rtl" className="min-h-screen bg-paper">
      <WhatsAppButton />
      <Nav profile={profile} onLogout={handleLogout} orgName={orgName} logoUrl={logoUrl} />

      <section className="border-b-4 border-seal bg-navy">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1.15fr_0.85fr] md:items-center md:px-8 md:py-20">
          <div>
            <p className="mb-4 inline-block rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/80">
              منصة توثيق العقود الإلكترونية
            </p>
            <h1 className="mb-4 font-display text-2xl font-extrabold leading-tight text-white sm:text-3xl md:text-4xl">
              وثّق عقودك إلكترونيًا بثقة وسهولة
            </h1>
            <p className="mb-8 max-w-xl text-base leading-relaxed text-white/70 md:text-lg">
              أنشئ عقودًا متعددة الأطراف، أرسلها للتوقيع برابط فريد، وتحقق من هوية الأطراف عبر نفاذ — كل ذلك من مكان
              واحد، بدون أوراق وبدون تعقيد.
            </p>
          </div>

          <div className="rounded-md border border-white/15 bg-white/5">
            {TRUST_POINTS.map(({ icon: Icon, label }, i) => (
              <div key={label} className={`flex items-center gap-3 px-5 py-4 ${i > 0 ? 'border-t border-white/10' : ''}`}>
                <Icon size={18} className="shrink-0 text-white/80" />
                <span className="text-sm font-bold text-white/90">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {activeFlow && <CreateEntryFlow documentType={activeFlow} onClose={() => setActiveFlow(null)} />}

      <section className="border-b border-line bg-card">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center md:px-8">
          <SectionEyebrow>نبذة عنّا</SectionEyebrow>
          <h2 className="mb-3 font-display text-2xl font-extrabold text-ink md:text-3xl">من نحن</h2>
          <p className="text-base leading-relaxed text-slate">
            إقرار منصة سعودية لتوثيق العقود والإقرارات إلكترونيًا، تجمع بين سهولة الاستخدام وقوة التحقق من الهوية
            الوطنية، لتمنح الأفراد والمنشآت وسيلة موثوقة لإتمام اتفاقياتهم دون الحاجة للقاء الأطراف فعليًا.
          </p>
        </div>
      </section>

      <QuickVerify />

      <section className="border-y border-line bg-card py-14">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <SectionEyebrow>خدماتنا</SectionEyebrow>
            <h2 className="font-display text-2xl font-extrabold text-ink md:text-3xl">توثيق العقود وإنشاء التفويضات</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col rounded-md border border-line bg-paper p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-sealLight">
                <FileSignature size={22} className="text-seal" />
              </div>
              <h3 className="mb-2 font-display text-lg font-bold text-ink">توثيق العقود</h3>
              <p className="mb-5 flex-1 text-sm leading-relaxed text-slate">
                وثّق أي اتفاقية بين طرفين أو أكثر إلكترونيًا: اكتب بنود العقد أو ارفعه PDF جاهزًا، حدّد أطرافه
                وصفاتهم، وأرسله لهم للتوقيع الإلكتروني أو التصديق عبر نفاذ — لتحصل في النهاية على مستند نهائي
                معتمد برقم توثيق ورمز QR يُثبت صحته في أي وقت.
              </p>
              <button
                type="button"
                onClick={() => setActiveFlow('contract')}
                className="group flex items-center justify-center gap-2 rounded-md bg-sage px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
              >
                إنشاء عقد <ArrowLeft size={16} className="transition group-hover:-translate-x-1" />
              </button>
            </div>
            <div className="flex flex-col rounded-md border border-line bg-paper p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-sealLight">
                <Stamp size={22} className="text-seal" />
              </div>
              <h3 className="mb-2 font-display text-lg font-bold text-ink">إنشاء تفويض موثق</h3>
              <p className="mb-5 flex-1 text-sm leading-relaxed text-slate">
                أصدر تفويضًا موثّقًا لطرف واحد (المفوَّض) بأقل بيانات ممكنة — الاسم ورقم الهوية والجنسية — ليحصل
                بموجبه على وثيقة معتمدة برقم توثيق ورمز QR، مناسبة للوكالات والتفويضات السريعة التي لا تتطلب
                أطرافًا متعددة.
              </p>
              <button
                type="button"
                onClick={() => setActiveFlow('power_of_attorney')}
                className="group flex items-center justify-center gap-2 rounded-md bg-sage px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
              >
                إنشاء تفويض <ArrowLeft size={16} className="transition group-hover:-translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <SectionEyebrow>مستويات التوثيق</SectionEyebrow>
          <h2 className="mb-3 font-display text-2xl font-extrabold text-ink md:text-3xl">أنواع التوثيق</h2>
          <p className="text-base leading-relaxed text-slate">اختر طريقة التوثيق المناسبة لكل طرف في عقدك حسب مستوى التوثيق المطلوب.</p>
        </div>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2">
          {VERIFICATION_TYPES.map(({ icon: Icon, title, badge, desc, details }) => {
            const isOpen = expandedVerification === title;
            return (
              <button
                key={title}
                type="button"
                onClick={() => setExpandedVerification(isOpen ? null : title)}
                className="bg-card p-6 text-right transition hover:bg-paper"
              >
                <div className="mb-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-sealLight">
                  <Icon size={20} className="text-seal" />
                </div>
                <h3 className="mb-1.5 flex items-center gap-2 font-display text-base font-bold text-ink">
                  {title}
                  {badge && <span className="rounded-full bg-clayLight px-2.5 py-1 text-sm font-bold text-clay">{badge}</span>}
                </h3>
                <p className="text-sm leading-relaxed text-slate">{desc}</p>
                {isOpen && <p className="mt-3 border-t border-line pt-3 text-sm leading-relaxed text-slate">{details}</p>}
                <span className="mt-3 block text-xs font-bold text-seal">{isOpen ? 'إخفاء التفاصيل' : 'عرض المزيد'}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-20">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <SectionEyebrow>مزايا المنصة</SectionEyebrow>
          <h2 className="font-display text-2xl font-extrabold text-ink md:text-3xl">كل ما تحتاجه لتوثيق عقودك</h2>
        </div>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-card p-6 transition hover:bg-paper">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-sealLight">
                <Icon size={20} className="text-seal" />
              </div>
              <h3 className="mb-1.5 font-display text-base font-bold text-ink">{title}</h3>
              <p className="text-sm leading-relaxed text-slate">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-navy">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center md:px-8">
          <h2 className="mb-3 font-display text-2xl font-extrabold text-white md:text-3xl">جاهز للبدء؟</h2>
          <p className="mx-auto mb-8 max-w-xl text-sm text-white/70 md:text-base">
            أنشئ حسابك الآن مجانًا وابدأ بتوثيق عقودك الأولى خلال دقائق.
          </p>
          <Link to="/register" className="inline-block rounded-md bg-white px-8 py-3.5 text-sm font-bold text-ink hover:bg-white/90">
            إنشاء حساب مجانًا
          </Link>
        </div>
      </section>

      <footer className="border-t border-line bg-card">
        <div className="mx-auto max-w-6xl px-4 py-12 md:px-8">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <div className="mb-3 flex items-center gap-2">
                {logoUrl ? (
                  <img src={logoUrl} alt={orgName} className="h-7 w-7 rounded-md object-contain" />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-seal">
                    <FileSignature size={14} className="text-white" />
                  </div>
                )}
                <span className="font-display font-bold text-ink">{orgName}</span>
              </div>
              <p className="text-sm leading-relaxed text-slate">منصة سعودية لتوثيق العقود والإقرارات إلكترونيًا.</p>
              {siteSettings?.contact_email && (
                <a
                  href={`mailto:${siteSettings.contact_email}`}
                  className="mt-2 flex items-center gap-1.5 text-sm font-bold text-ink hover:text-seal"
                  dir="ltr"
                >
                  <Mail size={14} /> {siteSettings.contact_email}
                </a>
              )}
              {siteSettings && siteSettings.social_links.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {siteSettings.social_links.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={link.label}
                      className="flex h-8 items-center gap-1.5 rounded-full bg-paper px-3 text-xs font-bold text-ink hover:bg-sealLight hover:text-seal"
                    >
                      <Globe size={14} /> {link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="mb-3 text-xs font-bold text-slate">المنصة</p>
              <ul className="space-y-2 text-sm font-bold text-ink">
                <li><Link to="/" className="hover:text-seal">الرئيسية</Link></li>
                <li><Link to="/verify" className="hover:text-seal">التحقق من وثيقة</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-xs font-bold text-slate">الحساب</p>
              <ul className="space-y-2 text-sm font-bold text-ink">
                <li><Link to="/login" className="hover:text-seal">تسجيل الدخول</Link></li>
                <li><Link to="/register" className="hover:text-seal">إنشاء حساب</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-xs font-bold text-slate">قانوني</p>
              <ul className="space-y-2 text-sm font-bold text-ink">
                <li><Link to="/terms" className="hover:text-seal">سياسة الاستخدام والخصوصية</Link></li>
                <li><Link to="/app/contact" className="hover:text-seal">اتصل بنا</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-4 text-center text-xs text-slate md:px-8">
            © {new Date().getFullYear()} {orgName}. جميع الحقوق محفوظة.
          </div>
        </div>
      </footer>
    </div>
  );
}
