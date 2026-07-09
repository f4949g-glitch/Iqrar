import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSignature } from 'lucide-react';
import { requestRegistrationOtp, verifyRegistrationOtp } from '../api/authApi';
import { signIn } from '../api/authApi';

const NATIONALITIES = ['سعودي', 'مقيم'];

interface RegisterFormProps {
  onRegistered: () => void;
}

export function RegisterForm({ onRegistered }: RegisterFormProps) {
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [nationality, setNationality] = useState(NATIONALITIES[0]);
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('يجب ألا تقل كلمة المرور عن 8 أحرف');
      return;
    }
    setSubmitting(true);
    try {
      const result = await requestRegistrationOtp({ phone, national_id: nationalId, email });
      setDevCode(result.dev_code ?? '');
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setSubmitting(false);
    }
  };

  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await verifyRegistrationOtp({
        phone,
        code,
        full_name: fullName,
        national_id: nationalId,
        nationality,
        date_of_birth: dob,
        email,
        password,
      });
      await signIn(email, password);
      onRegistered();
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
      <div className="w-full max-w-lg rounded-2xl bg-card p-8 shadow-xl sm:p-10">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-seal">
            <FileSignature size={22} className="text-white" />
          </div>
          <span className="font-display text-xl font-extrabold text-ink">إقرار</span>
        </Link>

        {step === 'form' ? (
          <>
            <h2 className="mb-1 font-display text-xl font-bold text-ink">إنشاء حساب</h2>
            <p className="mb-6 text-sm text-slate">أنشئ حسابك للبدء بإنشاء العقود وإرسالها للتوثيق</p>
            <form className="space-y-4" onSubmit={submitForm}>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate">الاسم</label>
                <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate">رقم الهوية</label>
                  <input
                    required
                    inputMode="numeric"
                    pattern="[12][0-9]{9}"
                    title="10 أرقام تبدأ بـ 1 أو 2"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    className={inputClass}
                    style={{ direction: 'ltr' }}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate">الجنسية</label>
                  <select value={nationality} onChange={(e) => setNationality(e.target.value)} className={inputClass}>
                    {NATIONALITIES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate">تاريخ الميلاد</label>
                  <input required type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={inputClass} style={{ direction: 'ltr' }} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate">الجوال</label>
                  <input
                    required
                    inputMode="numeric"
                    pattern="05[0-9]{8}"
                    title="مثال: 05xxxxxxxx"
                    placeholder="05xxxxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputClass}
                    style={{ direction: 'ltr' }}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate">البريد الإلكتروني</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  style={{ direction: 'ltr' }}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate">كلمة المرور</label>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  style={{ direction: 'ltr' }}
                />
              </div>
              {error && (
                <p role="alert" className="text-sm font-bold text-clay">
                  {error}
                </p>
              )}
              <button type="submit" disabled={submitting} className="w-full rounded-full bg-seal py-3 font-bold text-white disabled:opacity-60">
                {submitting ? 'جارِ الإرسال...' : 'متابعة'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="mb-1 font-display text-xl font-bold text-ink">تحقق من رقم جوالك</h2>
            <p className="mb-6 text-sm text-slate">أرسلنا رمز تحقق مكوّنًا من 6 أرقام إلى {phone}</p>
            {devCode && (
              <p className="mb-4 rounded-lg bg-sealLight p-3 text-xs font-bold text-seal">
                وضع الاختبار: بوابة الرسائل غير مُفعّلة بعد — رمز التحقق هو {devCode}
              </p>
            )}
            <form className="space-y-4" onSubmit={submitOtp}>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate">رمز التحقق</label>
                <input
                  required
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className={`${inputClass} text-center text-lg tracking-[0.5em]`}
                  style={{ direction: 'ltr' }}
                />
              </div>
              {error && (
                <p role="alert" className="text-sm font-bold text-clay">
                  {error}
                </p>
              )}
              <button type="submit" disabled={submitting} className="w-full rounded-full bg-seal py-3 font-bold text-white disabled:opacity-60">
                {submitting ? 'جارِ التحقق...' : 'تأكيد وإنشاء الحساب'}
              </button>
              <button type="button" onClick={() => setStep('form')} className="w-full text-center text-sm font-bold text-slate hover:text-ink">
                تعديل البيانات
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-slate">
          لديك حساب بالفعل؟{' '}
          <Link to="/login" className="font-bold text-seal">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
