import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Trash2, X } from 'lucide-react';
import { StatusPill } from '@/shared/ui/StatusPill';
import { Button } from '@/shared/ui/Button';
import {
  deleteDraftContract,
  listActiveContracts,
  listApprovedContracts,
  listContractsAwaitingMySignature,
  listRejectedContracts,
  searchContracts,
  type ContractListItem,
} from '../api/contractsApi';
import { CONTRACT_STATUS_LABEL } from '../types';
import { formatDate } from '@/shared/lib/formatDate';

type Tab = 'new' | 'approved' | 'awaiting' | 'rejected';

const TABS: { key: Tab; label: string }[] = [
  { key: 'new', label: 'عقود جديدة' },
  { key: 'approved', label: 'العقود الموافق عليها' },
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
          {contract.signed_count} / {contract.parties_count} أطراف وقّعوا · آخر نشاط {formatDate(contract.updated_at)}
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

function isTab(value: string | null): value is Tab {
  return value === 'new' || value === 'awaiting' || value === 'approved' || value === 'rejected';
}

export function ContractsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState<Tab>(isTab(initialTab) ? initialTab : 'new');
  const [contracts, setContracts] = useState<ContractListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ContractListItem[] | null>(null);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async (activeTab: Tab) => {
    setLoading(true);
    setError('');
    try {
      const data =
        activeTab === 'new'
          ? await listActiveContracts()
          : activeTab === 'approved'
            ? await listApprovedContracts()
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
      setSearchResults((prev) => (prev ? prev.filter((c) => c.id !== id) : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر حذف العقد');
    }
  };

  const chooseTab = (next: Tab) => {
    setTab(next);
    setSearchParams(next === 'new' ? {} : { tab: next });
  };

  useEffect(() => {
    if (!searchOpen) return;
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults(null);
      return;
    }
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        setSearchResults(await searchContracts(trimmed));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'تعذّر البحث');
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [searchQuery, searchOpen]);

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults(null);
  };

  const visibleContracts = searchResults !== null ? searchResults : contracts;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {searchOpen ? (
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-line bg-card px-3 py-2 shadow-sm">
            <Search size={16} className="shrink-0 text-slate" />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بعنوان العقد في كل العقود..."
              className="w-full bg-transparent text-sm text-ink outline-none"
            />
            <button type="button" onClick={closeSearch} className="shrink-0 text-slate hover:text-ink">
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex gap-1 overflow-x-auto rounded-lg bg-card p-1 shadow-sm">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => chooseTab(t.key)}
                  className={`shrink-0 rounded-md px-3.5 py-2 text-xs font-bold transition sm:px-4 sm:text-sm ${
                    tab === t.key ? 'bg-seal text-white' : 'text-sealMuted hover:bg-sealLight'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              title="بحث في كل العقود"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card text-slate shadow-sm hover:text-ink"
            >
              <Search size={16} />
            </button>
          </div>
        )}
        <Link to="/app/contracts/new">
          <Button className="w-full">
            <span className="flex items-center justify-center gap-1.5">
              <Plus size={16} /> عقد جديد
            </span>
          </Button>
        </Link>
      </div>

      {loading && !searchOpen && <p className="text-sm text-slate">جارِ التحميل...</p>}
      {searching && <p className="text-sm text-slate">جارِ البحث...</p>}
      {error && <p className="text-sm font-bold text-clay">{error}</p>}
      {!loading && !searching && !error && visibleContracts.length === 0 && (
        <p className="rounded-xl border border-dashed border-line bg-card p-8 text-center text-sm text-slate">
          {searchResults !== null ? 'لا توجد نتائج مطابقة' : 'لا توجد عقود في هذا القسم حاليًا'}
        </p>
      )}
      <div className="space-y-3">
        {visibleContracts.map((c) => (
          <ContractCard key={c.id} contract={c} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}
