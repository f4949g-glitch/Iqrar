import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Copy, Download } from 'lucide-react';
import { StatusPill } from '@/shared/ui/StatusPill';
import { getContractDetail } from '../api/contractsApi';
import { supabase } from '@/lib/supabase/client';
import { CONTRACT_STATUS_LABEL, type Contract, type ContractEvent, type ContractParty } from '../types';

const PARTY_STATUS_LABEL: Record<string, string> = {
  pending: 'بانتظار التوقيع',
  viewed: 'تمت المشاهدة',
  signed: 'وقّع',
  rejected: 'مرفوض',
};

function copyLink(token: string) {
  const url = `${window.location.origin}/sign/${token}`;
  navigator.clipboard.writeText(url).catch(() => {});
}

export function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [parties, setParties] = useState<ContractParty[]>([]);
  const [events, setEvents] = useState<ContractEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const detail = await getContractDetail(id);
      setContract(detail.contract);
      setParties(detail.parties);
      setEvents(detail.events);
      if (detail.contract.final_file_path) {
        const { data } = await supabase.storage.from('contracts').createSignedUrl(detail.contract.final_file_path, 3600);
        if (data) setDownloadUrl(data.signedUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تحميل العقد');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="text-sm text-slate">جارِ التحميل...</p>;
  if (error) return <p className="text-sm font-bold text-clay">{error}</p>;
  if (!contract) return null;

  const info = CONTRACT_STATUS_LABEL[contract.status];
  const signedCount = parties.filter((p) => p.status === 'signed').length;
  const progress = parties.length > 0 ? Math.round((signedCount / parties.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">{contract.title}</h1>
          <p className="mt-1 text-xs text-slate">
            أُنشئ في {new Date(contract.created_at).toLocaleString('ar-SA')}
            {contract.expires_at && ` · ينتهي في ${new Date(contract.expires_at).toLocaleDateString('ar-SA')}`}
            {contract.invoice_amount !== null && ` · الفاتورة: ${contract.invoice_amount.toFixed(2)} ريال`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill label={info.label} bg={info.bg} fg={info.fg} />
          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg bg-sage px-3 py-1.5 text-sm font-bold text-white"
            >
              <Download size={14} /> تحميل النسخة النهائية
            </a>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-line bg-card p-5">
        <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate">
          <span>نسبة الإنجاز</span>
          <span>
            {signedCount} / {parties.length}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-paper">
          <div className="h-full rounded-full bg-sage transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="mb-3 font-display text-sm font-bold text-ink">الأطراف وسجل التوقيعات</h2>
        <div className="space-y-3">
          {parties.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3">
              <div>
                <p className="text-sm font-bold text-ink">{p.full_name}</p>
                <p className="text-xs text-slate">
                  {p.role_label} · {PARTY_STATUS_LABEL[p.status]}
                  {p.signed_at && ` في ${new Date(p.signed_at).toLocaleString('ar-SA')}`}
                </p>
              </div>
              {p.status !== 'signed' && contract.status !== 'draft' && (
                <button
                  type="button"
                  onClick={() => copyLink(p.token)}
                  className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs font-bold text-ink hover:bg-paper"
                >
                  <Copy size={12} /> نسخ رابط التوقيع
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="mb-3 font-display text-sm font-bold text-ink">سجل الأحداث</h2>
        <ul className="space-y-2 text-sm text-slate">
          {events.map((e) => (
            <li key={e.id} className="flex justify-between border-b border-line pb-2 last:border-0">
              <span>{e.message ?? e.event_type}</span>
              <span className="text-xs">{new Date(e.created_at).toLocaleString('ar-SA')}</span>
            </li>
          ))}
          {events.length === 0 && <li className="text-xs text-slate">لا توجد أحداث بعد</li>}
        </ul>
      </div>
    </div>
  );
}
