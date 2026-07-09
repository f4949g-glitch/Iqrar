import { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { Button } from '@/shared/ui/Button';
import { fetchMyBalance, redeemCreditCode } from '../api/creditCodesApi';

export function BalancePage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => {
    fetchMyBalance()
      .then(setBalance)
      .catch(() => setBalance(null));
  };

  useEffect(() => {
    load();
  }, []);

  const redeem = async () => {
    setError('');
    setSuccess('');
    if (!code.trim()) return;
    setRedeeming(true);
    try {
      const newBalance = await redeemCreditCode(code.trim().toUpperCase());
      setBalance(newBalance);
      setSuccess('تم شحن رصيدك بنجاح');
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر شحن الرصيد');
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-ink">رصيدي</h1>

      <div className="flex items-center gap-4 rounded-2xl border border-line bg-card p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sealLight">
          <Wallet size={26} className="text-seal" />
        </div>
        <div>
          <p className="font-display text-2xl font-extrabold text-ink">{balance !== null ? `${balance.toFixed(2)} ريال` : '—'}</p>
          <p className="text-xs text-slate">رصيدك الحالي — يُخصم منه تلقائيًا عند إرسال أي عقد للتوثيق</p>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="mb-3 font-display text-sm font-bold text-ink">شحن الرصيد بكود</h2>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Field label="كود الشحن" value={code} onChange={setCode} />
          </div>
          <Button onClick={redeem} disabled={redeeming || !code.trim()}>
            {redeeming ? 'جارِ الشحن...' : 'شحن'}
          </Button>
        </div>
        {error && <p className="mt-3 text-sm font-bold text-clay">{error}</p>}
        {success && <p className="mt-3 text-sm font-bold text-sage">{success}</p>}
      </div>
    </div>
  );
}
