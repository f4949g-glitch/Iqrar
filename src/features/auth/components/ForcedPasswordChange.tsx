import { useState } from 'react';
import { changePassword } from '../api/authApi';

interface ForcedPasswordChangeProps {
  onDone: () => void;
}

export function ForcedPasswordChange({ onDone }: ForcedPasswordChangeProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('يجب ألا تقل كلمة المرور عن 8 أحرف');
      return;
    }
    if (password !== confirm) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(password);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-paper p-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-10 shadow-xl">
        <h2 className="mb-1 font-display text-xl font-bold text-ink">تغيير كلمة المرور</h2>
        <p className="mb-6 text-sm text-slate">هذا أول تسجيل دخول لك — يلزم تعيين كلمة مرور جديدة قبل المتابعة</p>
        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label htmlFor="new-password" className="mb-1.5 block text-xs font-bold text-slate">
              كلمة المرور الجديدة
            </label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-right text-ink outline-none"
              style={{ direction: 'ltr' }}
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-1.5 block text-xs font-bold text-slate">
              تأكيد كلمة المرور
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-right text-ink outline-none"
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
            {submitting ? 'جارِ الحفظ...' : 'حفظ ومتابعة'}
          </button>
        </form>
      </div>
    </div>
  );
}
