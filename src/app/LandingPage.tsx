import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSignature, ShieldCheck, Users, Zap, Lock, ScanLine, PenTool, ListChecks, X, LogIn, UserPlus, ArrowLeft } from 'lucide-react';

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
];

const VERIFICATION_TYPES = [
  {
    icon: ShieldCheck,
    title: 'توقيع عبر نفاذ',
    desc: 'تحقق رسمي من هوية الطرف عبر منصة نفاذ الوطنية، مناسب للعقود التي تتطلب أعلى درجات التوثيق.',
  },
  {
    icon: PenTool,
    title: 'توقيع إلكتروني',
    desc: 'توقيع إلكتروني مباشر بخط اليد داخل المتصفح، مناسب للإقرارات والاتفاقيات الأسرع والأبسط.',
  },
];

function Nav() {
  return (
    <header className="border-b border-line bg-card/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-seal">
            <FileSignature size={18} className="text-white" />
          </div>
          <span className="font-display text-lg font-extrabold text-ink">إقرار</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/verify" className="hidden items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-ink hover:bg-paper sm:flex">
            <ShieldCheck size={16} /> التحقق من وثيقة
          </Link>
          <Link to="/login" className="rounded-full px-4 py-2 text-sm font-bold text-ink hover:bg-paper">
            تسجيل الدخول
          </Link>
          <Link to="/register" className="rounded-full bg-seal px-5 py-2 text-sm font-bold text-white hover:opacity-90">
            إنشاء حساب
          </Link>
        </div>
      </div>
    </header>
  );
}

function DocumentationChooser({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" dir="rtl" onClick={onClose}>
      <div className="relative w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="إغلاق" className="absolute left-4 top-4 text-slate hover:text-ink">
          <X size={20} />
        </button>
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-sealLight">
            <FileSignature size={22} className="text-seal" />
          </div>
          <h3 className="font-display text-lg font-bold text-ink">توثيق العقود</h3>
          <p className="mt-1 text-sm text-slate">كيف تريد المتابعة؟</p>
        </div>
        <div className="space-y-2">
          <Link to="/login" className="flex items-center gap-2 rounded-lg border border-line px-4 py-3 text-sm font-bold text-ink hover:bg-paper">
            <LogIn size={16} /> تسجيل الدخول
          </Link>
          <Link to="/register" className="flex items-center gap-2 rounded-lg bg-seal px-4 py-3 text-sm font-bold text-white hover:opacity-90">
            <UserPlus size={16} /> إنشاء حساب
          </Link>
          <Link to="/app/contracts/new" className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-bold text-seal hover:bg-sealLight">
            <ArrowLeft size={16} /> استمرار كضيف
          </Link>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const [showChooser, setShowChooser] = useState(false);

  return (
    <div dir="rtl" className="min-h-screen bg-paper">
      <Nav />

      <section className="bg-hero">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center md:px-8 md:py-28">
          <p className="mb-4 inline-block rounded-full bg-white px-4 py-1.5 text-xs font-bold text-seal shadow-sm">
            منصة توثيق العقود الإلكترونية
          </p>
          <h1 className="mx-auto mb-5 max-w-3xl font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl md:text-5xl">
            وثّق عقودك واعتماداتك إلكترونيًا بثقة وسهولة
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-slate md:text-lg">
            أنشئ عقودًا متعددة الأطراف، أرسلها للتوقيع برابط فريد، وتحقق من هوية الأطراف عبر نفاذ — كل ذلك من مكان
            واحد، بدون أوراق وبدون تعقيد.
          </p>

          <button
            type="button"
            onClick={() => setShowChooser(true)}
            className="mx-auto mb-8 flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl bg-white p-6 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-seal">
              <FileSignature size={28} className="text-white" />
            </div>
            <span className="font-display text-base font-bold text-ink">توثيق العقود</span>
            <span className="text-xs text-slate">ابدأ توثيق عقدك الآن</span>
          </button>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register" className="w-full rounded-full bg-seal px-8 py-3.5 text-sm font-bold text-white shadow-lg hover:opacity-90 sm:w-auto">
              إنشاء حساب
            </Link>
            <Link to="/login" className="w-full rounded-full bg-white px-8 py-3.5 text-sm font-bold text-ink shadow-sm hover:bg-paper sm:w-auto">
              تسجيل الدخول
            </Link>
            <Link to="/app" className="w-full rounded-full px-8 py-3.5 text-sm font-bold text-seal hover:underline sm:w-auto">
              استمرار كضيف
            </Link>
          </div>
        </div>
      </section>

      {showChooser && <DocumentationChooser onClose={() => setShowChooser(false)} />}

      <section className="mx-auto max-w-6xl px-4 py-16 md:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="mb-3 font-display text-2xl font-extrabold text-ink md:text-3xl">أنواع التوثيق</h2>
          <p className="text-base leading-relaxed text-slate">اختر طريقة التوثيق المناسبة لكل طرف في عقدك حسب مستوى التوثيق المطلوب.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {VERIFICATION_TYPES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-line bg-card p-6 shadow-sm transition hover:shadow-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sealLight">
                <Icon size={22} className="text-seal" />
              </div>
              <h3 className="mb-1.5 font-display text-base font-bold text-ink">{title}</h3>
              <p className="text-sm leading-relaxed text-slate">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="mb-3 font-display text-2xl font-extrabold text-ink md:text-3xl">من نحن</h2>
          <p className="text-base leading-relaxed text-slate">
            إقرار منصة سعودية لتوثيق العقود والإقرارات إلكترونيًا، تجمع بين سهولة الاستخدام وقوة التحقق من الهوية
            الوطنية، لتمنح الأفراد والمنشآت وسيلة موثوقة لإتمام اتفاقياتهم دون الحاجة للقاء الأطراف فعليًا.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-line bg-card p-6 shadow-sm transition hover:shadow-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sealLight">
                <Icon size={22} className="text-seal" />
              </div>
              <h3 className="mb-1.5 font-display text-base font-bold text-ink">{title}</h3>
              <p className="text-sm leading-relaxed text-slate">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center md:px-8">
          <h2 className="mb-3 font-display text-2xl font-extrabold text-ink md:text-3xl">جاهز للبدء؟</h2>
          <p className="mx-auto mb-8 max-w-xl text-sm text-slate md:text-base">
            أنشئ حسابك الآن مجانًا وابدأ بتوثيق عقودك الأولى خلال دقائق.
          </p>
          <Link to="/register" className="inline-block rounded-full bg-seal px-8 py-3.5 text-sm font-bold text-white shadow-lg hover:opacity-90">
            إنشاء حساب مجانًا
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-slate md:flex-row md:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-seal">
              <FileSignature size={14} className="text-white" />
            </div>
            <span className="font-display font-bold text-ink">إقرار</span>
          </div>
          <p>© {new Date().getFullYear()} إقرار. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
}
