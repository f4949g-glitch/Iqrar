import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { getThemePreference, setThemePreference } from '@/shared/lib/theme';

// تبديل سريع بين الوضعين الفاتح/الداكن (بلا خيار "حسب النظام" هنا لتبسيط الزر
// الظاهر في الترويسة؛ يبدأ من التفضيل المحفوظ أو من إعداد نظام التشغيل الحالي).
function resolveInitialIsDark(): boolean {
  const pref = getThemePreference();
  if (pref === 'dark') return true;
  if (pref === 'light') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(resolveInitialIsDark);

  const toggle = () => {
    const next = !isDark;
    setThemePreference(next ? 'dark' : 'light');
    setIsDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="تبديل الوضع الداكن"
      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate hover:bg-paper hover:text-ink"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
