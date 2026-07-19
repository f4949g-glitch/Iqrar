import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FileSignature, Menu } from 'lucide-react';
import { signOut, type Profile } from '@/features/auth';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';
import { WhatsAppButton } from '@/shared/ui/WhatsAppButton';
import { Sidebar } from './Sidebar';
import { NotificationsBell } from './NotificationsBell';
import { AccountMenu } from './AccountMenu';

export function Layout({
  profile,
  templateCount = 0,
  children,
}: {
  profile: Profile | null;
  templateCount?: number;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    if (!window.confirm('هل تريد تسجيل الخروج؟')) return;
    await signOut();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-paper" dir="rtl">
      <header className="no-print border-b border-line bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-1">
            {profile && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label="فتح القائمة"
                className="-ms-1 flex h-9 w-9 items-center justify-center rounded-lg text-ink hover:bg-paper md:hidden"
              >
                <Menu size={20} />
              </button>
            )}
            <Link to="/app" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-seal">
                <FileSignature size={18} className="text-white" />
              </div>
              <span className="font-display text-lg font-extrabold text-ink">
                <span className="sm:hidden">إقرار</span>
                <span className="hidden sm:inline">منصة إقرار لخدمات الأعمال</span>
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            {profile ? (
              <>
                <NotificationsBell profile={profile} />
                <AccountMenu profile={profile} onLogout={handleLogout} />
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
      </header>
      {/* لا "mx-auto max-w-7xl" هنا عمدًا: الشريط الجانبي "sticky" يستقر عند حافة
          هذا الحاوي نفسه، فلو كان محدود العرض ومُمركزًا لظهر الشريط عائمًا في
          منتصف الشاشة على الشاشات العريضة بدل ملاصقة الحافة الفعلية للمتصفح. */}
      <div className="flex">
        {profile && (
          <Sidebar profile={profile} templateCount={templateCount} mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
        )}
        <main className="min-w-0 flex-1 p-4 md:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
      <div className="no-print">
        <WhatsAppButton />
      </div>
    </div>
  );
}
