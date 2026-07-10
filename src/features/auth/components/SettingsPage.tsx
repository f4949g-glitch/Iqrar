import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { getThemePreference, setThemePreference, type ThemePreference } from '@/shared/lib/theme';
import { changePassword } from '../api/authApi';
import { passwordError } from '@/shared/lib/validation';

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'فاتح', icon: Sun },
  { value: 'dark', label: 'داكن', icon: Moon },
];

export function SettingsPage() {
  const [theme, setTheme] = useState<ThemePreference>(getThemePreference());
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const chooseTheme = (value: ThemePreference) => {
    setThemePreference(value);
    setTheme(value);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const pwError = passwordError(password);
    if (pwError) {
      setError(pwError);
      return;
    }
    if (password !== confirm) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(password);
      setSuccess('تم تغيير كلمة المرور بنجاح');
      setPassword('');
      setConfirm('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تغيير كلمة المرور');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full rounded-lg border border-line bg-white px-3 py-2.5 text-right text-ink outline-none focus:border-seal';

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-ink">الإعدادات</h1>

      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="mb-3 font-display text-sm font-bold text-ink">مظهر النظام</h2>
        <div className="flex gap-2">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => chooseTheme(value)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-bold ${
                theme === value ? 'border-seal bg-sealLight text-seal' : 'border-line text-slate'
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={submit} className="rounded-xl border border-line bg-card p-5">
        <h2 className="mb-3 font-display text-sm font-bold text-ink">تغيير كلمة المرور</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate">كلمة المرور الجديدة</label>
            <input
              type="password"
              placeholder="8-15 حرفًا: كبير وصغير ورقم ورمز"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              style={{ direction: 'ltr' }}
            />
            <p className="mt-1 text-xs text-slate">8-15 حرفًا، ويجب أن تحتوي على حرف كبير وحرف صغير ورقم ورمز خاص</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate">تأكيد كلمة المرور</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} style={{ direction: 'ltr' }} />
          </div>
        </div>
        {error && <p className="mt-3 text-sm font-bold text-clay">{error}</p>}
        {success && <p className="mt-3 text-sm font-bold text-sage">{success}</p>}
        <div className="mt-4">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'جارِ الحفظ...' : 'حفظ كلمة المرور'}
          </Button>
        </div>
      </form>
    </div>
  );
}
