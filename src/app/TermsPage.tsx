import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, FileSignature } from 'lucide-react';
import { fetchLegalPage, parseLegalSections, type LegalPage } from '@/features/site/api/legalApi';

export function TermsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState<LegalPage | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLegalPage('privacy_policy')
      .then(setPage)
      .catch((err) => setError(err instanceof Error ? err.message : 'تعذّر تحميل الصفحة'));
  }, []);

  const sections = page ? parseLegalSections(page.content) : [];

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
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-bold text-slate hover:text-ink"
        >
          <ArrowRight size={16} />
          رجوع
        </button>
        <h1 className="font-display text-2xl font-extrabold text-ink">{page?.title ?? 'سياسة الاستخدام والخصوصية'}</h1>
        <p className="text-sm text-slate">هذه نسخة أولية عامة من الشروط وسياسة الخصوصية، ويُنصح بمراجعتها من مختص قانوني قبل الاعتماد النهائي.</p>
        {error && <p className="text-sm font-bold text-clay">{error}</p>}
        {!page && !error && <p className="text-sm text-slate">جارِ التحميل...</p>}
        <div className="space-y-4">
          {sections.map((s) => (
            <div key={s.title} className="rounded-xl border border-line bg-card p-5">
              <h2 className="mb-2 font-display text-sm font-bold text-ink">{s.title}</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate">{s.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
