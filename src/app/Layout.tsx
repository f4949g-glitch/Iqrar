import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileSignature, LogOut } from 'lucide-react';
import { signOut, type Profile } from '@/features/auth';

export function Layout({ profile, children }: { profile: Profile; children: ReactNode }) {
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-paper" dir="rtl">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-seal">
              <FileSignature size={18} className="text-white" />
            </div>
            <span className="font-display text-lg font-extrabold text-ink">إقرار</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate sm:inline">{profile.email}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold text-clay hover:bg-clayLight"
            >
              <LogOut size={16} />
              خروج
            </button>
          </div>
        </div>
        {location.pathname.startsWith('/contracts') && (
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <h1 className="pb-3 font-display text-sm font-bold text-slate">توثيق العقود</h1>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-6xl p-4 md:p-8">{children}</main>
    </div>
  );
}
