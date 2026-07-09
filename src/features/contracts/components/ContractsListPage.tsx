import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Percent, Plus } from 'lucide-react';
import { StatusPill } from '@/shared/ui/StatusPill';
import { Button } from '@/shared/ui/Button';
import {
  listActiveContracts,
  listContractsAwaitingMySignature,
  listPreviousContracts,
  type ContractListItem,
} from '../api/contractsApi';
import { CONTRACT_STATUS_LABEL } from '../types';

type Tab = 'new' | 'previous' | 'awaiting';

const TABS: { key: Tab; label: string }[] = [
  { key: 'new', label: 'عقود جديدة' },
  { key: 'previous', label: 'عقود سابقة' },
  { key: 'awaiting', label: 'عقود تتطلب التوثيق' },
];

function ContractCard({ contract }: { contract: ContractListItem }) {
  const info = CONTRACT_STATUS_LABEL[contract.status];
  return (
    <Link
      to={`/contracts/${contract.id}`}
      className="flex items-center justify-between rounded-xl border border-line bg-card p-4 shadow-sm transition hover:shadow-md"
    >
      <div>
        <p className="font-display font-bold text-ink">{contract.title}</p>
        <p className="mt-1 text-xs text-slate">
          {contract.signed_count} / {contract.parties_count} أطراف وقّعوا · {new Date(contract.created_at).toLocaleDateString('ar-SA')}
        </p>
      </div>
      <StatusPill label={info.label} bg={info.bg} fg={info.fg} />
    </Link>
  );
}

export function ContractsListPage() {
  const [tab, setTab] = useState<Tab>('new');
  const [contracts, setContracts] = useState<ContractListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (activeTab: Tab) => {
    setLoading(true);
    setError('');
    try {
      const data =
        activeTab === 'new'
          ? await listActiveContracts()
          : activeTab === 'previous'
            ? await listPreviousContracts()
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-1 rounded-lg bg-card p-1 shadow-sm">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-md px-4 py-2 text-sm font-bold transition ${
                tab === t.key ? 'bg-seal text-white' : 'text-slate hover:bg-paper'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link to="/contracts/discounts">
            <Button variant="secondary">
              <span className="flex items-center gap-1.5">
                <Percent size={16} /> أكواد الخصم
              </span>
            </Button>
          </Link>
          <Link to="/contracts/new">
            <Button>
              <span className="flex items-center gap-1.5">
                <Plus size={16} /> عقد جديد
              </span>
            </Button>
          </Link>
        </div>
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
          <ContractCard key={c.id} contract={c} />
        ))}
      </div>
    </div>
  );
}
