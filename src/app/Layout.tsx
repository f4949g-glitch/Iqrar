import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileSignature, LogOut } from 'lucide-react';
import { signOut, type Profile } from '@/features/auth';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';
import { WhatsAppButton } from '@/shared/ui/WhatsAppButton';
import { Sidebar } from './Sidebar';

const MOBILE_LINKS = [
  { to: '/app/profile', label: 'ملفي' },
  { to: '/app/contracts?tab=previous', label: 'عقودي' },
  { to: '/app/contracts?tab=awaiting', label: 'الموافقات' },
  { to: '/app/contracts?tab=rejected', label: 'مرفوضة' },
  { to: '/app/balance', label: 'رصيدي' },
  { to: '/app/settings', label: 'الإعدادات' },
];

export function Layout({ profile, children }: { profile: Profile | null; children: ReactNode }) {
  const location = useLocation();
  const currentPath = `${location.pathname}${location.search}`;

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-paper" dir="rtl">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
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
        {profile && (
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2 md:px-8 lg:hidden">
            {MOBILE_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                  currentPath === l.to ? 'bg-sealLight text-seal' : 'text-slate hover:bg-paper'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </header>
      <div className="mx-auto flex max-w-7xl">
        {profile && <Sidebar profile={profile} />}
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
      <WhatsAppButton />
    </div>
  );
}
