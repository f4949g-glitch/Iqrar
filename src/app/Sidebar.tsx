import { Link, useLocation } from 'react-router-dom';
import { User, FileClock, ClipboardCheck, FileX2, Settings, ShieldQuestion, Phone, Percent, Wallet, SlidersHorizontal } from 'lucide-react';
import type { Profile } from '@/features/auth';

interface SidebarLink {
  to: string;
  label: string;
  icon: typeof User;
}

const MAIN_LINKS: SidebarLink[] = [
  { to: '/app/profile', label: 'الملف الشخصي', icon: User },
  { to: '/app/contracts?tab=previous', label: 'عقودي السابقة', icon: FileClock },
  { to: '/app/contracts?tab=awaiting', label: 'طلبات الموافقة', icon: ClipboardCheck },
  { to: '/app/contracts?tab=rejected', label: 'عقود مرفوضة', icon: FileX2 },
  { to: '/app/balance', label: 'رصيدي', icon: Wallet },
];

const FOOTER_LINKS: SidebarLink[] = [
  { to: '/app/settings', label: 'الإعدادات', icon: Settings },
  { to: '/terms', label: 'سياسة الاستخدام والخصوصية', icon: ShieldQuestion },
  { to: '/app/contact', label: 'اتصل بنا', icon: Phone },
];

const ADMIN_LINKS: SidebarLink[] = [
  { to: '/app/contracts/discounts', label: 'أكواد الخصم', icon: Percent },
  { to: '/app/contracts/credit-codes', label: 'أكواد الشحن', icon: Wallet },
  { to: '/app/contracts/pricing', label: 'إعدادات التسعير', icon: SlidersHorizontal },
];

function NavItem({ link, active }: { link: SidebarLink; active: boolean }) {
  const Icon = link.icon;
  return (
    <Link
      to={link.to}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-bold transition ${
        active ? 'bg-sealLight text-seal' : 'text-slate hover:bg-paper hover:text-ink'
      }`}
    >
      <Icon size={17} />
      {link.label}
    </Link>
  );
}

export function Sidebar({ profile }: { profile: Profile }) {
  const location = useLocation();
  const currentPath = `${location.pathname}${location.search}`;
  const isActive = (to: string) => currentPath === to || (!to.includes('?') && location.pathname === to);

  return (
    <aside className="hidden w-60 shrink-0 border-e border-line bg-card p-4 lg:flex lg:flex-col lg:justify-between lg:sticky lg:top-0 lg:h-screen">
      <div>
        <nav className="space-y-1">
          {MAIN_LINKS.map((link) => (
            <NavItem key={link.to} link={link} active={isActive(link.to)} />
          ))}
        </nav>

        {profile.role === 'admin' && (
          <>
            <p className="mb-1 mt-5 px-3 text-[11px] font-bold text-slate">الإدارة</p>
            <nav className="space-y-1">
              {ADMIN_LINKS.map((link) => (
                <NavItem key={link.to} link={link} active={isActive(link.to)} />
              ))}
            </nav>
          </>
        )}
      </div>

      <nav className="space-y-1 border-t border-line pt-3">
        {FOOTER_LINKS.map((link) => (
          <NavItem key={link.to} link={link} active={isActive(link.to)} />
        ))}
      </nav>
    </aside>
  );
}
