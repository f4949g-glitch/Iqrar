import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileText, Plus, ShieldCheck, Trash2, TrendingUp } from 'lucide-react';
import { StatusPill } from '@/shared/ui/StatusPill';
import { Button } from '@/shared/ui/Button';
import {
  deleteDraftContract,
  listActiveContracts,
  listContractsAwaitingMySignature,
  listPreviousContracts,
  listRejectedContracts,
  type ContractListItem,
} from '../api/contractsApi';
import { CONTRACT_STATUS_LABEL } from '../types';
import { formatDate } from '@/shared/lib/formatDate';

type Tab = 'new' | 'previous' | 'awaiting' | 'rejected';

const TABS: { key: Tab; label: string }[] = [
  { key: 'new', label: 'عقود جديدة' },
  { key: 'previous', label: 'عقود سابقة' },
  { key: 'awaiting', label: 'طلبات الموافقة' },
  { key: 'rejected', label: 'عقود مرفوضة' },
];

function ContractCard({ contract, onDelete }: { contract: ContractListItem; onDelete: (id: string) => void }) {
  const info = CONTRACT_STATUS_LABEL[contract.status];
  return (
    <Link
      to={`/app/contracts/${contract.id}`}
      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-card p-4 shadow-sm transition hover:shadow-md"
    >
      <div>
        <p className="font-display font-bold text-ink">{contract.title}</p>
        <p className="mt-1 text-xs text-slate">
          {contract.signed_count} / {contract.parties_count} أطراف وقّعوا · {formatDate(contract.created_at)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <StatusPill label={info.label} bg={info.bg} fg={info.fg} />
        {contract.status === 'draft' && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(contract.id);
            }}
            title="حذف المسودة"
            className="rounded-lg p-1.5 text-slate hover:bg-clayLight hover:text-clay"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </Link>
  );
}

interface StatCardProps {
  icon: typeof FileText;
  label: string;
  value: string | number;
  accent: 'seal' | 'sage' | 'clay';
}

function StatCard({ icon: Icon, label, value, accent }: StatCardProps) {
  const accentClass = { seal: 'bg-sealLight text-seal', sage: 'bg-sageLight text-sage', clay: 'bg-clayLight text-clay' }[accent];
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4 shadow-sm">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accentClass}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="font-display text-xl font-extrabold text-ink">{value}</p>
        <p className="text-xs text-slate">{label}</p>
      </div>
    </div>
  );
}

function isTab(value: string | null): value is Tab {
  return value === 'new' || value === 'previous' || value === 'awaiting' || value === 'rejected';
}

export function ContractsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState<Tab>(isTab(initialTab) ? initialTab : 'new');
  const [contracts, setContracts] = useState<ContractListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<{ total: number; completed: number; signedParties: number; totalParties: number } | null>(null);

  const load = useCallback(async (activeTab: Tab) => {
    setLoading(true);
    setError('');
    try {
      const data =
        activeTab === 'new'
          ? await listActiveContracts()
          : activeTab === 'previous'
            ? await listPreviousContracts()
            : activeTab === 'rejected'
              ? await listRejectedContracts()
              : await listContractsAwaitingMySignature();
      setContracts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تحميل العقود');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المسودة؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    try {
      await deleteDraftContract(id);
      setContracts((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر حذف العقد');
    }
  };

  useEffect(() => {
    Promise.all([listActiveContracts(), listPreviousContracts()])
      .then(([active, previous]) => {
        const all = [...active, ...previous];
        setStats({
          total: all.length,
          completed: previous.filter((c) => c.status === 'completed').length,
          signedParties: all.reduce((sum, c) => sum + c.signed_count, 0),
          totalParties: all.reduce((sum, c) => sum + c.parties_count, 0),
        });
      })
      .catch(() => setStats(null));
  }, []);

  const chooseTab = (next: Tab) => {
    setTab(next);
    setSearchParams(next === 'new' ? {} : { tab: next });
  };

  const completionRate = stats && stats.totalParties > 0 ? Math.round((stats.signedParties / stats.totalParties) * 100) : 0;

  return (
    <div>
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={FileText} label="إجمالي العقود" value={stats.total} accent="seal" />
          <StatCard icon={ShieldCheck} label="عقود موثّقة" value={stats.completed} accent="sage" />
          <StatCard icon={TrendingUp} label="نسبة إتمام التوقيع" value={`${completionRate}%`} accent="seal" />
          <StatCard icon={FileText} label="أطراف وقّعت" value={`${stats.signedParties} / ${stats.totalParties}`} accent="clay" />
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-card p-1 shadow-sm">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => chooseTab(t.key)}
              className={`shrink-0 rounded-md px-3.5 py-2 text-xs font-bold transition sm:px-4 sm:text-sm ${
                tab === t.key ? 'bg-seal text-white' : 'text-slate hover:bg-paper'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Link to="/app/contracts/new">
          <Button className="w-full">
            <span className="flex items-center justify-center gap-1.5">
              <Plus size={16} /> عقد جديد
            </span>
          </Button>
        </Link>
      </div>

      {loading && <p className="text-sm text-slate">جارِ التحميل...</p>}
      {error && <p className="text-sm font-bold text-clay">{error}</p>}
      {!loading && !error && contracts.length === 0 && (
        <p className="rounded-xl border border-dashed border-line bg-card p-8 text-center text-sm text-slate">
          لا توجد عقود في هذا القسم حاليًا
        </p>
      )}
      <div className="space-y-3">
        {contracts.map((c) => (
          <ContractCard key={c.id} contract={c} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}
