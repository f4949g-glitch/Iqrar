import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { sendContract } from '../../api/contractsApi';
import { FIELD_TYPE_LABELS, type Contract, type ContractField, type ContractParty } from '../../types';

interface ReviewStepProps {
  contract: Contract;
  parties: ContractParty[];
  fields: ContractField[];
  onBack: () => void;
}

export function ReviewStep({ contract, parties, fields, onBack }: ReviewStepProps) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const send = async () => {
    setSubmitting(true);
    setError('');
    try {
      await sendContract(contract.id);
      navigate(`/contracts/${contract.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر إرسال العقد');
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-line bg-card p-5">
        <h3 className="mb-1 font-display text-lg font-bold text-ink">{contract.title}</h3>
        {contract.duration_days && <p className="text-xs text-slate">مدة التوثيق: {contract.duration_days} يومًا</p>}
      </div>

      <div className="rounded-xl border border-line bg-card p-5">
        <h4 className="mb-3 font-display text-sm font-bold text-ink">الأطراف ({parties.length})</h4>
        <ul className="space-y-2">
          {parties.map((p) => (
            <li key={p.id} className="flex items-center justify-between text-sm">
              <span className="text-ink">{p.full_name}</span>
              <span className="text-slate">{p.role_label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-line bg-card p-5">
        <h4 className="mb-3 font-display text-sm font-bold text-ink">الحقول ({fields.length})</h4>
        <ul className="space-y-1 text-sm text-slate">
          {fields.map((f) => {
            const party = parties.find((p) => p.id === f.party_id);
            return (
              <li key={f.id}>
                صفحة {f.page_number} — {FIELD_TYPE_LABELS[f.field_type]} ({party?.full_name ?? '—'})
              </li>
            );
          })}
        </ul>
      </div>

      {error && <p className="text-sm font-bold text-clay">{error}</p>}

      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack} disabled={submitting}>
          السابق
        </Button>
        <Button onClick={send} disabled={submitting}>
          {submitting ? 'جارِ الإرسال...' : 'إرسال للتوثيق'}
        </Button>
      </div>
    </div>
  );
}
