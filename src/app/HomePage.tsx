import { Link } from 'react-router-dom';
import { FileSignature } from 'lucide-react';

export function HomePage() {
  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-extrabold text-ink">مرحبًا بك في إقرار</h1>
      <p className="mb-8 text-sm text-slate">اختر خدمة للبدء</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/contracts"
          className="flex flex-col items-start gap-3 rounded-2xl border border-line bg-card p-6 shadow-sm transition hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sealLight">
            <FileSignature size={24} className="text-seal" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-ink">توثيق العقود</h2>
            <p className="mt-1 text-sm text-slate">إنشاء عقود، إرسالها للأطراف، ومتابعة التوثيق والتوقيع الإلكتروني</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
