import { Link } from 'react-router-dom';
import { FileSignature } from 'lucide-react';

const SECTIONS = [
  {
    title: 'قبول الشروط',
    body: 'باستخدامك منصة إقرار فإنك توافق على هذه الشروط وسياسة الخصوصية. إذا كنت لا توافق عليها، يرجى عدم استخدام المنصة.',
  },
  {
    title: 'طبيعة الخدمة',
    body: 'إقرار منصة إلكترونية لإنشاء العقود والإقرارات وتوثيقها وتوقيعها إلكترونيًا، عبر توقيع إلكتروني عادي أو تحقق من الهوية عبر منصة نفاذ الوطنية.',
  },
  {
    title: 'التزامات المستخدم',
    body: 'يلتزم المستخدم بصحة البيانات التي يُدخلها، وبعدم استخدام المنصة لأي غرض مخالف للأنظمة، وبالمحافظة على سرية بيانات دخوله.',
  },
  {
    title: 'الرسوم والدفع',
    body: 'تُحتسب رسوم توثيق كل عقد وفق سياسة التسعير المعلنة، وتُخصم من رصيد المستخدم في المنصة عند إرسال العقد للتوثيق.',
  },
  {
    title: 'حفظ البيانات وخصوصيتها',
    body: 'تُحفظ بيانات العقود والأطراف بما يلزم لتقديم الخدمة والتحقق من صحة الوثائق لاحقًا، ولا تُشارك مع أي جهة خارجية إلا وفق ما تقتضيه الأنظمة.',
  },
  {
    title: 'التعديلات',
    body: 'تحتفظ إقرار بحق تعديل هذه الشروط من وقت لآخر، ويُعد استمرار استخدامك للمنصة بعد التعديل موافقة عليه.',
  },
];

export function TermsPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-paper">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-seal">
              <FileSignature size={18} className="text-white" />
            </div>
            <span className="font-display text-lg font-extrabold text-ink">
              <span className="sm:hidden">إقرار</span>
              <span className="hidden sm:inline">منصة إقرار لخدمات الأعمال</span>
            </span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 p-4 py-12">
        <h1 className="font-display text-2xl font-extrabold text-ink">سياسة الاستخدام والخصوصية</h1>
        <p className="text-sm text-slate">هذه نسخة أولية عامة من الشروط وسياسة الخصوصية، ويُنصح بمراجعتها من مختص قانوني قبل الاعتماد النهائي.</p>
        <div className="space-y-4">
          {SECTIONS.map((s) => (
            <div key={s.title} className="rounded-xl border border-line bg-card p-5">
              <h2 className="mb-2 font-display text-sm font-bold text-ink">{s.title}</h2>
              <p className="text-sm leading-relaxed text-slate">{s.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
