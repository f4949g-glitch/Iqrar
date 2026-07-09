import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSignature } from 'lucide-react';
import { signIn, signInWithNationalId } from '../api/authApi';

interface LoginFormProps {
  onSignedIn: () => void;
}

export function LoginForm({ onSignedIn }: LoginFormProps) {
  const [mode, setMode] = useState<'email' | 'national_id'>('email');
  const [email, setEmail] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'email') {
        await signIn(email, password);
      } else {
        await signInWithNationalId(nationalId, password);
      }
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
        <p className="mb-6 text-sm text-slate">أدخل بيانات حسابك للمتابعة</p>

        <div className="mb-6 flex rounded-full bg-paper p-1 text-sm font-bold">
          <button
            type="button"
            onClick={() => setMode('email')}
            className={`flex-1 rounded-full py-2 transition ${mode === 'email' ? 'bg-white text-seal shadow-sm' : 'text-slate'}`}
          >
            البريد الإلكتروني
          </button>
          <button
            type="button"
            onClick={() => setMode('national_id')}
            className={`flex-1 rounded-full py-2 transition ${mode === 'national_id' ? 'bg-white text-seal shadow-sm' : 'text-slate'}`}
          >
            رقم الهوية
          </button>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          {mode === 'email' ? (
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-bold text-slate">
                البريد الإلكتروني
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                spellCheck={false}
                placeholder="name@example.com"
                className={inputClass}
                style={{ direction: 'ltr' }}
              />
            </div>
          ) : (
            <div>
              <label htmlFor="national-id" className="mb-1.5 block text-xs font-bold text-slate">
                رقم الهوية
              </label>
              <input
                id="national-id"
                inputMode="numeric"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className={inputClass}
                style={{ direction: 'ltr' }}
              />
            </div>
          )}
          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-bold text-slate">
              كلمة المرور
            </label>
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
