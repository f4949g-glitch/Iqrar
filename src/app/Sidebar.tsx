import { Link, useLocation } from 'react-router-dom';
import {
  User,
  Home,
  FolderOpen,
  FileSignature,
  LayoutTemplate,
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
  Mail,
  Stamp,
} from 'lucide-react';
import type { Profile } from '@/features/auth';
import { hasAdminPermission } from '@/features/auth/types';
import { setPendingContractIntent } from '@/features/contracts/lib/pendingIntent';

interface SidebarLink {
  to: string;
  label: string;
  icon: typeof User;
  // تنفَّذ قبل الانتقال (مثال: حفظ نية إنشاء تفويض في sessionStorage كي
  // يقرأها معالج إنشاء العقد بعد فتح نفس مسار "/app/contracts/new" المشترك).
  onClick?: () => void;
}

interface SidebarGroup {
  title: string | null;
  links: SidebarLink[];
}

// مجموعات القائمة اليمنى للمستخدم: كل مجموعة بعنوان قصير يوضّح الغرض منها
// بدل قائمة مسطّحة واحدة، ليسهل إيجاد الرابط المطلوب بسرعة.
// "لوحة التحكم" رابط منفصل يفتح ملخّص الحساب (عدد العقود بكل حالة وأحدث نشاط)،
// و"عقودي" رابط منفصل يفتح قائمة العقود الكاملة بتبويباتها — كانا مدمجين
// سابقًا في رابط واحد يفتح الموقع العام، مما جعل "الرئيسية" بلا فائدة فعلية
// لمستخدم مسجَّل دخوله بالفعل.
// "قوالبي" يظهر فقط لمستخدم لديه قالب عقد جاهز واحد على الأقل مخصَّص له من
// الأدمن (templateCount > 0)، فلا يُثقَل الجميع برابط لا يخصهم.
function buildUserGroups(templateCount: number): SidebarGroup[] {
  const mainLinks: SidebarLink[] = [
    { to: '/app', label: 'لوحة التحكم', icon: Home },
    { to: '/app/contracts', label: 'عقودي', icon: FolderOpen },
    { to: '/app/contracts/new', label: 'إنشاء عقد', icon: FileSignature },
    { to: '/verify', label: 'التحقق من وثيقة موثقة', icon: ShieldCheck },
  ];
  if (templateCount > 0) {
    mainLinks.push({ to: '/app/templates', label: 'قوالبي', icon: LayoutTemplate });
  }
  return [
    { title: null, links: mainLinks },
    {
      title: 'التفويض',
      links: [
        {
          to: '/app/contracts/new',
          label: 'إنشاء تفويض',
          icon: Stamp,
          onClick: () => setPendingContractIntent({ documentType: 'power_of_attorney', partyCount: 1, verificationDefault: 'manual' }),
        },
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
}

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
      { to: '/app/email', label: 'إرسال بريد إلكتروني', icon: Mail },
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
  if (hasAdminPermission(profile, 'manage_contract_templates')) {
    systemLinks.push({ to: '/app/contracts/templates', label: 'قوالب العقود', icon: LayoutTemplate });
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
      onClick={() => {
        link.onClick?.();
        onNavigate?.();
      }}
      className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-bold leading-tight transition sm:gap-2.5 sm:px-3 sm:text-sm lg:gap-3 lg:px-3.5 lg:py-2.5 lg:text-[15px] ${
        active ? 'bg-sealLight text-seal' : 'text-sealMuted hover:bg-sealLight hover:text-seal'
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
      {group.title && <p className="mb-1 px-3 text-[11px] font-bold text-sealMuted lg:text-xs">{group.title}</p>}
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
  // عدد قوالب العقود المخصَّصة لهذا المستخدم — يُتحكَّم به من الأدمن، ويُجلب
  // مرة واحدة ضمن دورة تحديث الجلسة (SessionProvider) بدل استعلام منفصل هنا.
  templateCount?: number;
  // تُستخدم فقط في وضع الجوال (أقل من md): القائمة تنزلق من الجهة اليمنى فوق
  // المحتوى بدل حجز عرض ثابت دائمًا، وتُغلق تلقائيًا عند اختيار رابط أو الضغط
  // على الخلفية المعتمة خلفها. في md فما فوق تبقى القائمة ثابتة الظهور كسابقًا.
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ profile, templateCount = 0, mobileOpen = false, onMobileClose }: SidebarProps) {
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
          {buildUserGroups(templateCount).map((group) => (
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
