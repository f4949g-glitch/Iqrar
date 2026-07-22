import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutTemplate } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { listMyTemplates, type ContractTemplate } from '../api/contractTemplatesApi';
import { setPendingContractIntent } from '../lib/pendingIntent';
import { DOCUMENT_TYPE_LABELS } from '../types';

export function MyTemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listMyTemplates()
      .then(setTemplates)
      .catch((err) => setError(err instanceof Error ? err.message : 'تعذّر تحميل القوالب'))
      .finally(() => setLoading(false));
  }, []);

  const startFromTemplate = (template: ContractTemplate) => {
    setPendingContractIntent({
      documentType: template.document_type,
      partyCount: template.party_count,
      verificationDefault: 'manual',
      templateId: template.id,
      templateTitle: template.title,
      templateBody: template.body_json,
      templateSequentialSigning: template.sequential_signing,
    });
    navigate(`/app/contracts/new?type=${template.document_type === 'power_of_attorney' ? 'poa' : 'contract'}`);
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-ink">قوالبي</h1>
      <p className="text-sm text-slate">قوالب عقود جاهزة خصَّصها لك مدير المنصة — اختر قالبًا لبدء عقد جديد بمحتواه المُعَدّ سلفًا.</p>

      {loading && <p className="text-sm text-slate">جارِ التحميل...</p>}
      {error && <p className="text-sm font-bold text-clay">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <div key={t.id} className="flex flex-col gap-3 rounded-xl border border-line bg-card p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sealLight">
              <LayoutTemplate size={18} className="text-seal" />
            </div>
            <div>
              <p className="font-bold text-ink">{t.title}</p>
              <p className="text-xs text-slate">
                {DOCUMENT_TYPE_LABELS[t.document_type]} · {t.party_count} أطراف
              </p>
            </div>
            <Button onClick={() => startFromTemplate(t)}>استخدام هذا القالب</Button>
          </div>
        ))}
      </div>

      {!loading && templates.length === 0 && <p className="text-sm text-slate">لا توجد قوالب مخصَّصة لك حاليًا</p>}
    </div>
  );
}
