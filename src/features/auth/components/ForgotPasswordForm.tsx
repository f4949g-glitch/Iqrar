import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSignature } from 'lucide-react';
import { requestPasswordReset, confirmPasswordReset } from '../api/authApi';
import { nationalIdError, passwordError } from '@/shared/lib/validation';

export function ForgotPasswordForm() {
  const [step, setStep] = useState<'request' | 'confirm' | 'done'>('request');
  const [nationalId, setNationalId] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const inputClass =
    'w-full rounded-lg border border-line bg-white px-3 py-2.5 text-right text-ink outline-none focus:border-seal';

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const idError = nationalIdError(nationalId);
    if (idError) {
      setError(idError);
      return;
    }
    setSubmitting(true);
    try {
      const result = await requestPasswordReset(nationalId);
      setDevCode(result.dev_code ?? '');
      setStep('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر إرسال رمز التحقق');
    } finally {
      setSubmitting(false);
    }
  };

  const submitConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const pwError = passwordError(newPassword);
    if (pwError) {
      setError(pwError);
      return;
    }
    setSubmitting(true);
    try {
      await confirmPasswordReset(nationalId, code, newPassword);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تحديث كلمة المرور');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-hero p-4" dir="rtl">
      <div className="w-full max-w-md rounded-2xl bg-card p-10 shadow-xl">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-seal">
            <FileSignature size={22} className="text-white" />
          </div>
          <span className="font-display text-xl font-extrabold text-ink">إقرار</span>
        </Link>

        {step === 'request' && (
          <>
            <h2 className="mb-1 font-display text-xl font-bold text-ink">استعادة كلمة المرور</h2>
            <p className="mb-6 text-sm text-slate">أدخل رقم هويتك وسنرسل رمز تحقق إلى جوالك المسجَّل</p>
            <form className="space-y-4" onSubmit={submitRequest}>
              <div>
                <label htmlFor="national-id" className="mb-1.5 block text-xs font-bold text-slate">
                  رقم الهوية
                </label>
                <input
                  id="national-id"
                  inputMode="numeric"
                  maxLength={10}
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                  autoComplete="off"
                  spellCheck={false}
                  className={inputClass}
                  style={{ direction: 'ltr' }}
                />
                <p className="mt-1 text-xs text-slate">10 أرقام فقط</p>
              </div>
              {error && (
                <p role="alert" className="text-sm font-bold text-clay">
                  {error}
                </p>
              )}
              <button type="submit" disabled={submitting} className="w-full rounded-full bg-seal py-3 font-bold text-white disabled:opacity-60">
                {submitting ? 'جارِ الإرسال...' : 'إرسال رمز التحقق'}
              </button>
            </form>
          </>
        )}

        {step === 'confirm' && (
          <>
            <h2 className="mb-1 font-display text-xl font-bold text-ink">أدخل رمز التحقق</h2>
            <p className="mb-6 text-sm text-slate">
              أرسلنا رمزًا مكوّنًا من 6 أرقام إلى جوالك المسجَّل، صالح لمدة 10 دقائق
            </p>
            {devCode && (
              <p className="mb-4 rounded-lg bg-paper p-2.5 text-xs font-bold text-slate">
                وضع الاختبار (لا توجد بوابة SMS مفعّلة بعد): رمز التحقق هو <span dir="ltr">{devCode}</span>
              </p>
            )}
            <form className="space-y-4" onSubmit={submitConfirm}>
              <div>
                <label htmlFor="code" className="mb-1.5 block text-xs font-bold text-slate">
                  رمز التحقق
                </label>
                <input
                  id="code"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  autoComplete="off"
                  spellCheck={false}
                  className={inputClass}
                  style={{ direction: 'ltr' }}
                />
              </div>
              <div>
                <label htmlFor="new-password" className="mb-1.5 block text-xs font-bold text-slate">
                  كلمة المرور الجديدة
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  spellCheck={false}
                  placeholder="8-15 حرفًا: كبير وصغير ورقم ورمز"
                  className={inputClass}
                  style={{ direction: 'ltr' }}
                />
                <p className="mt-1 text-xs text-slate">8-15 حرفًا، ويجب أن تحتوي على حرف كبير وحرف صغير ورقم ورمز خاص</p>
              </div>
              {error && (
                <p role="alert" className="text-sm font-bold text-clay">
                  {error}
                </p>
              )}
              <button type="submit" disabled={submitting} className="w-full rounded-full bg-seal py-3 font-bold text-white disabled:opacity-60">
                {submitting ? 'جارِ الحفظ...' : 'تحديث كلمة المرور'}
              </button>
            </form>
          </>
        )}

        {step === 'done' && (
          <>
            <h2 className="mb-2 font-display text-xl font-bold text-ink">تم تحديث كلمة المرور</h2>
            <p className="mb-6 text-sm text-slate">يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة</p>
            <Link to="/login" className="block w-full rounded-full bg-seal py-3 text-center font-bold text-white">
              الذهاب لتسجيل الدخول
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
