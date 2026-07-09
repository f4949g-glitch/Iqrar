import { useState } from 'react';
import { FileSignature } from 'lucide-react';
import { signIn } from '../api/authApi';

interface LoginFormProps {
  onSignedIn: () => void;
}

export function LoginForm({ onSignedIn }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signIn(email, password);
      onSignedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-paper p-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-10 shadow-xl">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-seal">
            <FileSignature size={22} className="text-white" />
          </div>
          <span className="font-display text-xl font-extrabold text-ink">إقرار — توثيق العقود</span>
        </div>
        <h2 className="mb-1 font-display text-xl font-bold text-ink">تسجيل الدخول</h2>
        <p className="mb-6 text-sm text-slate">أدخل بيانات حسابك للمتابعة</p>
        <form className="space-y-4" onSubmit={submit}>
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
              className="w-full rounded-lg border border-line px-3 py-2.5 text-right outline-none"
              style={{ direction: 'ltr' }}
            />
          </div>
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
              className="w-full rounded-lg border border-line px-3 py-2.5 text-right outline-none"
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
            className="w-full rounded-lg bg-seal py-3 font-bold text-white disabled:opacity-60"
          >
            {submitting ? 'جارِ الدخول...' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  );
}
