import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileClock, FileCheck2, FileQuestion, FileX2, FilePlus2, Plus } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { StatusPill } from '@/shared/ui/StatusPill';
import { useSession } from '@/features/auth/hooks/useSession';
import {
  listActiveContracts,
  listApprovedContracts,
  listContractsAwaitingMySignature,
  listDraftContracts,
  listRecentContracts,
  listRejectedContracts,
  type ContractListItem,
} from '../api/contractsApi';
import { CONTRACT_STATUS_LABEL } from '../types';
import { formatDate } from '@/shared/lib/formatDate';

interface StatCard {
  key: string;
  label: string;
  icon: typeof FileClock;
  count: number;
  href: string;
  accent: string;
}

// ملخّص سريع لحساب المستخدم: عدد العقود في كل حالة (بروابط مباشرة لتبويبها في
// "عقودي")، وقائمة بأحدث نشاط عبر كل عقوده — بديل صفحة "الرئيسية" التي كانت
// تفتح الموقع العام سابقًا فتبدو بلا فائدة لمستخدم مسجَّل دخوله بالفعل.
export function DashboardPage() {
  const { profile } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [recent, setRecent] = useState<ContractListItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [drafts, active, awaiting, approved, rejected, recentContracts] = await Promise.all([
          listDraftContracts(),
          listActiveContracts(),
          listContractsAwaitingMySignature(),
          listApprovedContracts(),
          listRejectedContracts(),
          listRecentContracts(6),
        ]);
        if (cancelled) return;
        setCounts({
          draft: drafts.length,
          new: active.length,
          awaiting: awaiting.length,
          approved: approved.length,
          rejected: rejected.length,
        });
        setRecent(recentContracts);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'تعذّر تحميل ملخّص الحساب');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats: StatCard[] = [
    { key: 'draft', label: 'مسودة', icon: FilePlus2, count: counts.draft ?? 0, href: '/app/contracts?tab=draft', accent: 'text-slate' },
    { key: 'new', label: 'عقود جديدة', icon: FileClock, count: counts.new ?? 0, href: '/app/contracts?tab=new', accent: 'text-seal' },
    { key: 'awaiting', label: 'طلبات الموافقة', icon: FileQuestion, count: counts.awaiting ?? 0, href: '/app/contracts?tab=awaiting', accent: 'text-seal' },
    { key: 'approved', label: 'العقود الموافق عليها', icon: FileCheck2, count: counts.approved ?? 0, href: '/app/contracts?tab=approved', accent: 'text-sage' },
    { key: 'rejected', label: 'عقود مرفوضة', icon: FileX2, count: counts.rejected ?? 0, href: '/app/contracts?tab=rejected', accent: 'text-clay' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">لوحة التحكم</h1>
          <p className="mt-1 text-sm text-slate">أهلًا بك يا {profile?.full_name || profile?.email}، هذا ملخّص ما يحدث في حسابك</p>
        </div>
        <Link to="/app/contracts/new?type=contract">
          <Button>
            <span className="flex items-center gap-1.5">
              <Plus size={16} /> عقد جديد
            </span>
          </Button>
        </Link>
      </div>

      {error && <p className="text-sm font-bold text-clay">{error}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Link
            key={s.key}
            to={s.href}
            className="flex flex-col gap-2 rounded-xl border border-line bg-card p-4 shadow-sm transition hover:shadow-md"
          >
            <s.icon size={20} className={s.accent} />
            <p className="font-display text-2xl font-extrabold text-ink">{loading ? '—' : s.count}</p>
            <p className="text-xs font-bold text-slate">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="mb-4 font-display text-sm font-bold text-ink">أحدث نشاط</h2>
        {loading && <p className="text-sm text-slate">جارِ التحميل...</p>}
        {!loading && recent.length === 0 && <p className="text-sm text-slate">لا يوجد نشاط بعد — ابدأ بإنشاء عقدك الأول</p>}
        <div className="space-y-2">
          {recent.map((c) => {
            const info = CONTRACT_STATUS_LABEL[c.status];
            return (
              <Link
                key={c.id}
                to={`/app/contracts/${c.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3 transition hover:bg-paper"
              >
                <div>
                  <p className="font-bold text-ink">{c.title}</p>
                  <p className="mt-0.5 text-xs text-slate">
                    {c.signed_count} / {c.parties_count} أطراف وقّعوا · آخر نشاط {formatDate(c.updated_at)}
                  </p>
                </div>
                <StatusPill label={info.label} bg={info.bg} fg={info.fg} />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
