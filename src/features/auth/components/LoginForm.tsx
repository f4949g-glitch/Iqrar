import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSignature } from 'lucide-react';
import { signInWithNationalId } from '../api/authApi';

interface LoginFormProps {
  onSignedIn: () => void;
}

export function LoginForm({ onSignedIn }: LoginFormProps) {
  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signInWithNationalId(nationalId, password);
      onSignedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-line bg-white px-3 py-2.5 text-right text-ink outline-none focus:border-seal';

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-hero p-4" dir="rtl">
      <div className="w-full max-w-md rounded-2xl bg-card p-10 shadow-xl">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-seal">
            <FileSignature size={22} className="text-white" />
          </div>
          <span className="font-display text-xl font-extrabold text-ink">إقرار</span>
        </Link>
        <h2 className="mb-1 font-display text-xl font-bold text-ink">تسجيل الدخول</h2>
        <p className="mb-6 text-sm text-slate">أدخل رقم هويتك وكلمة المرور للمتابعة</p>

        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label htmlFor="national-id" className="mb-1.5 block text-xs font-bold text-slate">
              رقم الهوية
            </label>
            <input
              id="national-id"
              inputMode="numeric"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value.replace(/[^0-9]/g, ''))}
              autoComplete="off"
              spellCheck={false}
              className={inputClass}
              style={{ direction: 'ltr' }}
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="text-xs font-bold text-slate">
                كلمة المرور
              </label>
              <Link to="/forgot-password" className="text-xs font-bold text-seal">
                نسيت كلمة المرور؟
              </Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="current-password"
              spellCheck={false}
              placeholder="••••••••"
              className={inputClass}
              style={{ direction: 'ltr' }}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm font-bold text-clay">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-seal py-3 font-bold text-white disabled:opacity-60"
          >
            {submitting ? 'جارِ الدخول...' : 'دخول'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate">
          ليس لديك حساب؟{' '}
          <Link to="/register" className="font-bold text-seal">
            إنشاء حساب
          </Link>
        </p>
      </div>
    </div>
  );
}
