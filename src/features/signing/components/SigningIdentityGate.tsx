import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { requestSigningIdentityOtp, verifySigningIdentityOtp } from '../api/signingApi';
import type { SigningIdentityGateSession } from '../api/signingApi';

// بوابة تحقق هوية عبر رمز SMS لطرف بطريقة "يدوي" قبل عرض أي جزء من محتوى
// العقد له — طرف نفاذ لا يمرّ بهذا المكوّن إطلاقًا (get-signing-session يستثنيه).
export function SigningIdentityGate({
  token,
  party,
  onVerified,
}: {
  token: string;
  party: SigningIdentityGateSession['party'];
  onVerified: () => void;
}) {
  const [step, setStep] = useState<'intro' | 'otp'>('intro');
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState('');
  const [phoneHint, setPhoneHint] = useState('');
  const [devCode, setDevCode] = useState('');
  const [error, setError] = useState('');

  const requestOtp = async () => {
    setRequesting(true);
    setError('');
    try {
      const res = await requestSigningIdentityOtp(token);
      setPhoneHint(res.phone_hint ?? '');
      setDevCode(res.sms_configured ? '' : res.dev_code ?? '');
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر إرسال رمز التحقق');
    } finally {
      setRequesting(false);
    }
  };

  const verify = async () => {
    setVerifying(true);
    setError('');
    try {
      await verifySigningIdentityOtp(token, code.trim());
      onVerified();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر التحقق من الرمز');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-4" dir="rtl">
      <div className="w-full max-w-sm rounded-2xl bg-card p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sealLight">
          <ShieldCheck size={24} className="text-seal" />
        </div>
        <h2 className="mb-2 font-display text-lg font-bold text-ink">تحقق من هويتك</h2>
        <p className="mb-5 text-sm text-slate">
          مرحبًا {party.full_name || party.role_label}، لإثبات هويتك قبل عرض المستند نرسل رمز تحقق إلى جوالك المسجَّل لدى منشئ العقد.
        </p>

        {step === 'intro' && (
          <>
            <Button onClick={requestOtp} disabled={requesting} className="w-full">
              {requesting ? 'جارِ الإرسال...' : 'إرسال رمز التحقق'}
            </Button>
            {error && <p className="mt-3 text-xs font-bold text-clay">{error}</p>}
          </>
        )}

        {step === 'otp' && (
          <div className="space-y-2 text-right">
            <p className="text-xs font-bold text-ink">أُرسل رمز تحقق إلى جوالك ({phoneHint})</p>
            {devCode && <p className="text-xs text-slate">رمز الاختبار (بوابة SMS غير مُفعَّلة بعد): {devCode}</p>}
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              placeholder="رمز التحقق"
              className="w-full rounded-lg border border-line bg-card px-3 py-2 text-center text-sm text-ink outline-none focus:border-seal"
            />
            {error && <p className="text-xs font-bold text-clay">{error}</p>}
            <Button onClick={verify} disabled={verifying || code.trim().length < 4} className="w-full">
              {verifying ? 'جارِ التحقق...' : 'تحقق ومتابعة'}
            </Button>
            <button type="button" onClick={requestOtp} disabled={requesting} className="w-full text-center text-xs font-bold text-slate hover:text-ink">
              {requesting ? 'جارِ الإرسال...' : 'إعادة إرسال الرمز'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
