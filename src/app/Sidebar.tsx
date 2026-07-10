import { Link, useLocation } from 'react-router-dom';
import {
  User,
  Home,
  FileSignature,
  FileClock,
  ClipboardCheck,
  FileX2,
  Settings,
  ShieldQuestion,
  ShieldCheck,
  Phone,
  Percent,
  Wallet,
  SlidersHorizontal,
} from 'lucide-react';
import type { Profile } from '@/features/auth';

interface SidebarLink {
  to: string;
  label: string;
  icon: typeof User;
}

interface SidebarGroup {
  title: string | null;
  links: SidebarLink[];
}

// مجموعات القائمة اليمنى للمستخدم: كل مجموعة بعنوان قصير يوضّح الغرض منها
// بدل قائمة مسطّحة واحدة، ليسهل إيجاد الرابط المطلوب بسرعة.
const USER_GROUPS: SidebarGroup[] = [
  {
    title: null,
    links: [
      { to: '/', label: 'الصفحة الرئيسية', icon: Home },
      { to: '/app/contracts/new', label: 'توثيق العقود', icon: FileSignature },
      { to: '/verify', label: 'التحقق من وثيقة موثقة', icon: ShieldCheck },
    ],
  },
  {
    title: 'عقودي',
    links: [
      { to: '/app/contracts?tab=previous', label: 'عقودي السابقة', icon: FileClock },
      { to: '/app/contracts?tab=awaiting', label: 'طلبات الموافقة', icon: ClipboardCheck },
      { to: '/app/contracts?tab=rejected', label: 'عقود مرفوضة', icon: FileX2 },
    ],
  },
  {
    title: 'حسابي',
    links: [
      { to: '/app/profile', label: 'الملف الشخصي', icon: User },
      { to: '/app/balance', label: 'رصيدي', icon: Wallet },
    ],
  },
];

const FOOTER_LINKS: SidebarLink[] = [
  { to: '/app/settings', label: 'الإعدادات', icon: Settings },
  { to: '/terms', label: 'سياسة الاستخدام والخصوصية', icon: ShieldQuestion },
  { to: '/app/contact', label: 'اتصل بنا', icon: Phone },
];

const ADMIN_GROUP: SidebarGroup = {
  title: 'الإدارة',
  links: [
    { to: '/app/contracts/discounts', label: 'أكواد الخصم', icon: Percent },
    { to: '/app/contracts/credit-codes', label: 'أكواد الشحن', icon: Wallet },
    { to: '/app/contracts/pricing', label: 'إعدادات التسعير', icon: SlidersHorizontal },
  ],
};

function NavItem({ link, active, onNavigate }: { link: SidebarLink; active: boolean; onNavigate?: () => void }) {
  const Icon = link.icon;
  return (
    <Link
      to={link.to}
      onClick={onNavigate}
      className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-bold leading-tight transition sm:gap-2.5 sm:px-3 sm:text-sm ${
        active ? 'bg-sealLight text-seal' : 'text-slate hover:bg-paper hover:text-ink'
      }`}
    >
      <Icon size={16} className="shrink-0 sm:size-[17px]" />
      <span>{link.label}</span>
    </Link>
  );
}

function NavGroup({ group, isActive, onNavigate }: { group: SidebarGroup; isActive: (to: string) => boolean; onNavigate?: () => void }) {
  return (
    <div className="mb-4 last:mb-0">
      {group.title && <p className="mb-1 px-3 text-[11px] font-bold text-slate">{group.title}</p>}
      <nav className="space-y-1">
        {group.links.map((link) => (
          <NavItem key={link.to} link={link} active={isActive(link.to)} onNavigate={onNavigate} />
        ))}
      </nav>
    </div>
  );
}

interface SidebarProps {
  profile: Profile;
  // تُستخدم فقط في وضع الجوال (أقل من md): القائمة تنزلق من الجهة اليمنى فوق
  // المحتوى بدل حجز عرض ثابت دائمًا، وتُغلق تلقائيًا عند اختيار رابط أو الضغط
  // على الخلفية المعتمة خلفها. في md فما فوق تبقى القائمة ثابتة الظهور كسابقًا.
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ profile, mobileOpen = false, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const currentPath = `${location.pathname}${location.search}`;
  const isActive = (to: string) => currentPath === to || (!to.includes('?') && location.pathname === to);

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-navy/50 md:hidden" onClick={onMobileClose} aria-hidden="true" />
      )}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-64 shrink-0 flex-col justify-between overflow-y-auto border-e border-line bg-card p-3 shadow-2xl transition-transform duration-200 md:sticky md:top-0 md:z-auto md:h-screen md:w-40 md:translate-x-0 md:p-3 md:shadow-none lg:w-60 lg:p-4 ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {USER_GROUPS.map((group) => (
            <NavGroup key={group.title ?? 'main'} group={group} isActive={isActive} onNavigate={onMobileClose} />
          ))}

          {profile.role === 'admin' && <NavGroup group={ADMIN_GROUP} isActive={isActive} onNavigate={onMobileClose} />}
        </div>

        <nav className="space-y-1 border-t border-line pt-3">
          {FOOTER_LINKS.map((link) => (
            <NavItem key={link.to} link={link} active={isActive(link.to)} onNavigate={onMobileClose} />
          ))}
        </nav>
      </aside>
    </>
  );
}
