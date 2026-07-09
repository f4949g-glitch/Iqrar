import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';

export function AuthGate() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-line bg-card p-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sealLight">
        <Lock size={24} className="text-seal" />
      </div>
      <h2 className="mb-2 font-display text-lg font-bold text-ink">يلزم تسجيل الدخول للمتابعة</h2>
      <p className="mb-6 max-w-sm text-sm text-slate">
        لإنشاء عقد أو إرساله للتوثيق يجب أن يكون لديك حساب. سجّل الدخول أو أنشئ حسابًا جديدًا برقم هويتك خلال دقيقة.
      </p>
      <div className="flex gap-3">
        <Link to="/login" className="rounded-full bg-white px-6 py-2.5 text-sm font-bold text-ink shadow-sm hover:bg-paper">
          تسجيل الدخول
        </Link>
        <Link to="/register" className="rounded-full bg-seal px-6 py-2.5 text-sm font-bold text-white hover:opacity-90">
          إنشاء حساب
        </Link>
      </div>
    </div>
  );
}
