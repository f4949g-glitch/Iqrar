import { Link } from 'react-router-dom';
import { FileSignature, ShieldCheck, Users, Zap, FileText, Lock } from 'lucide-react';

const FEATURES = [
  {
    icon: FileText,
    title: 'إنشاء العقود بسهولة',
    desc: 'ابدأ من محرر غني بحقول ديناميكية، أو ارفع ملف PDF/Word جاهزًا وحدّد مواضع الحقول بنفسك.',
  },
  {
    icon: Users,
    title: 'أطراف متعددون',
    desc: 'أضف أي عدد من الأطراف، حدد أدوارهم، وتابع حالة كل طرف حتى اكتمال التوثيق.',
  },
  {
    icon: ShieldCheck,
    title: 'توثيق موثوق عبر نفاذ',
    desc: 'تحقق من هوية أطراف العقد عبر منصة نفاذ الوطنية، أو بتوقيع إلكتروني عادي حسب الحاجة.',
  },
  {
    icon: Lock,
    title: 'أمان وخصوصية',
    desc: 'بياناتك ومستنداتك محمية بصلاحيات دقيقة، وكل عقد مُوثّق برمز تحقق فريد.',
  },
  {
    icon: Zap,
    title: 'إرسال فوري',
    desc: 'أرسل العقد لأطرافه برابط فريد للتوقيع الإلكتروني دون تعقيد أو تنزيل برامج.',
  },
  {
    icon: FileSignature,
    title: 'مستند نهائي معتمد',
    desc: 'احصل على نسخة نهائية موقّعة برمز QR وصفحة تحقق رسمية من صحة التوثيق.',
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

export function LandingPage() {
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
