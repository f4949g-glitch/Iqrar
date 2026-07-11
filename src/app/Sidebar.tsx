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
  BarChart3,
  Users,
  MessageSquare,
  Building2,
  Send,
  Printer,
} from 'lucide-react';
import type { Profile } from '@/features/auth';
import { hasAdminPermission } from '@/features/auth/types';

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
      { to: '/app/contracts', label: 'عقود جديدة', icon: FileClock },
      { to: '/app/contracts?tab=approved', label: 'العقود الموافق عليها', icon: ShieldCheck },
      { to: '/app/contracts?tab=awaiting', label: 'طلبات الموافقة', icon: ClipboardCheck },
      { to: '/app/contracts?tab=rejected', label: 'عقود مرفوضة', icon: FileX2 },
    ],
  },
  {
    title: 'حسابي',
    links: [
      { to: '/app/profile', label: 'الملف الشخصي', icon: User },
      { to: '/app/balance', label: 'رصيدي', icon: Wallet },
      { to: '/app/settings', label: 'الإعدادات', icon: Settings },
      { to: '/terms', label: 'سياسة الاستخدام والخصوصية', icon: ShieldQuestion },
      { to: '/app/contact', label: 'اتصل بنا', icon: Phone },
    ],
  },
];

// روابط الإدارة تُبنى ديناميكيًا حسب دور المستخدم وصلاحياته: الأدمن الكامل يرى
// الكل، والأدمن الفرعي يرى فقط ما يملك صلاحيته تحديدًا. تُقسَّم إلى مجموعتين:
// "إدارة العملاء" لما يخص التواصل المباشر مع العملاء، و"إعدادات النظام" لما
// يخص ضبط المنصة نفسها.
function buildAdminGroups(profile: Profile): SidebarGroup[] {
  const isFullAdmin = profile.role === 'admin';
  const customerLinks: SidebarLink[] = [];
  const systemLinks: SidebarLink[] = [];

  if (isFullAdmin) {
    customerLinks.push(
      { to: '/app/customer-service', label: 'خدمة العملاء', icon: MessageSquare },
      { to: '/app/sms', label: 'إرسال رسائل SMS', icon: Send },
      { to: '/app/contracts/reprint-verification', label: 'إعادة طباعة معلومات التوثيق', icon: Printer },
    );
  }

  if (hasAdminPermission(profile, 'view_reports')) {
    systemLinks.push({ to: '/app/contracts/reports', label: 'التقارير الإحصائية', icon: BarChart3 });
  }
  if (hasAdminPermission(profile, 'create_discount_codes')) {
    systemLinks.push({ to: '/app/contracts/discounts', label: 'أكواد الخصم', icon: Percent });
  }
  if (hasAdminPermission(profile, 'create_credit_codes')) {
    systemLinks.push({ to: '/app/contracts/credit-codes', label: 'أكواد الشحن', icon: Wallet });
  }
  if (hasAdminPermission(profile, 'manage_pricing') || hasAdminPermission(profile, 'manage_pricing_direct')) {
    systemLinks.push({ to: '/app/contracts/pricing', label: 'إعدادات التسعير', icon: SlidersHorizontal });
  }
  if (isFullAdmin) {
    systemLinks.push(
      { to: '/app/org-settings', label: 'هوية المنشأة', icon: Building2 },
      { to: '/app/contracts/admin-users', label: 'مستخدمو الإدارة', icon: Users },
      { to: '/app/legal/privacy-policy', label: 'تعديل سياسة الخصوصية', icon: ShieldQuestion },
    );
  }

  const groups: SidebarGroup[] = [];
  if (customerLinks.length > 0) groups.push({ title: 'إدارة العملاء', links: customerLinks });
  if (systemLinks.length > 0) groups.push({ title: 'إعدادات النظام', links: systemLinks });
  return groups;
}

function NavItem({ link, active, onNavigate }: { link: SidebarLink; active: boolean; onNavigate?: () => void }) {
  const Icon = link.icon;
  return (
    <Link
      to={link.to}
      onClick={onNavigate}
      className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-bold leading-tight transition sm:gap-2.5 sm:px-3 sm:text-sm lg:gap-3 lg:px-3.5 lg:py-2.5 lg:text-[15px] ${
        active ? 'bg-sealLight text-seal' : 'text-slate hover:bg-paper hover:text-ink'
      }`}
    >
      <Icon size={16} className="shrink-0 sm:size-[17px] lg:size-5" />
      <span>{link.label}</span>
    </Link>
  );
}

function NavGroup({ group, isActive, onNavigate }: { group: SidebarGroup; isActive: (to: string) => boolean; onNavigate?: () => void }) {
  return (
    <div className="mb-4 last:mb-0">
      {group.title && <p className="mb-1 px-3 text-[11px] font-bold text-slate lg:text-xs">{group.title}</p>}
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
        className={`fixed inset-y-0 right-0 z-50 flex w-64 shrink-0 flex-col overflow-y-auto border-e border-line bg-card p-3 shadow-2xl transition-transform duration-200 md:sticky md:top-0 md:z-auto md:h-dvh md:w-40 md:translate-x-0 md:p-3 md:shadow-none lg:w-60 lg:p-4 ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {USER_GROUPS.map((group) => (
            <NavGroup key={group.title ?? 'main'} group={group} isActive={isActive} onNavigate={onMobileClose} />
          ))}

          {buildAdminGroups(profile).map((group) => (
            <NavGroup key={group.title} group={group} isActive={isActive} onNavigate={onMobileClose} />
          ))}
        </div>
      </aside>
    </>
  );
}
