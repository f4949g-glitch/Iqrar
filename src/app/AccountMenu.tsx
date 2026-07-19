import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, LogOut, Phone, Settings, ShieldQuestion, User, Wallet } from 'lucide-react';
import type { Profile } from '@/features/auth';

// اختصار سريع لحسابي/الإعدادات من الشريط العلوي مباشرة، بدل الاضطرار لفتح
// الشريط الجانبي الكامل (خصوصًا في وضع الجوال حيث يتطلب ضغطتين).
export function AccountMenu({ profile, onLogout }: { profile: Profile; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const links = [
    { to: '/app/profile', label: 'الملف الشخصي', icon: User },
    { to: '/app/balance', label: 'رصيدي', icon: Wallet },
    { to: '/app/settings', label: 'الإعدادات', icon: Settings },
    { to: '/terms', label: 'سياسة الاستخدام والخصوصية', icon: ShieldQuestion },
    { to: '/app/contact', label: 'اتصل بنا', icon: Phone },
  ];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-bold text-ink hover:bg-paper"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sealLight text-seal">
          <User size={15} />
        </span>
        <span className="hidden sm:inline">{profile.full_name || profile.email}</span>
        <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-card py-1.5 shadow-xl">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-sm font-bold text-ink hover:bg-paper"
            >
              <l.icon size={16} className="text-slate" />
              {l.label}
            </Link>
          ))}
          <div className="my-1.5 border-t border-line" />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm font-bold text-clay hover:bg-clayLight"
          >
            <LogOut size={16} />
            تسجيل الخروج
          </button>
        </div>
      )}
    </div>
  );
}
