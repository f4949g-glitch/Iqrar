import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileSignature, LogOut } from 'lucide-react';
import { signOut, type Profile } from '@/features/auth';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';

const MEMBER_LINKS = [
  { to: '/app/contracts', label: 'عقودي' },
  { to: '/app/balance', label: 'رصيدي' },
];

const ADMIN_LINKS = [
  { to: '/app/contracts/discounts', label: 'أكواد الخصم' },
  { to: '/app/contracts/credit-codes', label: 'أكواد الشحن' },
  { to: '/app/contracts/pricing', label: 'إعدادات التسعير' },
];

export function Layout({ profile, children }: { profile: Profile | null; children: ReactNode }) {
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/';
  };

  const navLinks = profile ? [...MEMBER_LINKS, ...(profile.role === 'admin' ? ADMIN_LINKS : [])] : [];

  return (
    <div className="min-h-screen bg-paper" dir="rtl">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
          <Link to="/app" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-seal">
              <FileSignature size={18} className="text-white" />
            </div>
            <span className="font-display text-lg font-extrabold text-ink">إقرار</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            {profile ? (
              <>
                <span className="hidden text-sm text-slate sm:inline">{profile.email}</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold text-clay hover:bg-clayLight"
                >
                  <LogOut size={16} />
                  خروج
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="rounded-full px-4 py-1.5 text-sm font-bold text-ink hover:bg-paper">
                  تسجيل الدخول
                </Link>
                <Link to="/register" className="rounded-full bg-seal px-4 py-1.5 text-sm font-bold text-white hover:opacity-90">
                  إنشاء حساب
                </Link>
              </>
            )}
          </div>
        </div>
        {navLinks.length > 0 && (
          <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 md:px-8">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                  location.pathname === l.to ? 'bg-sealLight text-seal' : 'text-slate hover:bg-paper'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}
        {location.pathname.startsWith('/app/contracts') && (
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <h1 className="pb-3 font-display text-sm font-bold text-slate">توثيق العقود</h1>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-6xl p-4 md:p-8">{children}</main>
    </div>
  );
}
