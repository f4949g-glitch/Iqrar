import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCircle2 } from 'lucide-react';
import { fetchCompletedContractNotifications, markNotificationsSeen, type ContractNotification } from '@/features/contracts/api/notificationsApi';
import { formatDateTime } from '@/shared/lib/formatDate';
import type { Profile } from '@/features/auth/types';

export function NotificationsBell({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ContractNotification[]>([]);
  const [seenAt, setSeenAt] = useState(profile.notifications_seen_at);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCompletedContractNotifications()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const unreadCount = items.filter((n) => !seenAt || new Date(n.completed_at) > new Date(seenAt)).length;

  const toggleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      const now = new Date().toISOString();
      setSeenAt(now);
      markNotificationsSeen().catch(() => {});
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="الإشعارات"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate hover:bg-paper hover:text-ink"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -left-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-clay px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-2 w-80 max-w-[90vw] rounded-md border border-line bg-card shadow-xl">
          <div className="border-b border-line px-4 py-3">
            <p className="font-display text-sm font-bold text-ink">الإشعارات</p>
            <p className="text-xs text-slate">العقود التي أرسلتها وتمت الموافقة عليها بالكامل</p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate">لا توجد إشعارات بعد</p>
            ) : (
              items.map((n) => (
                <Link
                  key={n.id}
                  to={`/app/contracts/${n.id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-2.5 border-b border-line px-4 py-3 text-sm last:border-0 hover:bg-paper"
                >
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-sage" />
                  <span>
                    <span className="block font-bold text-ink">تمت الموافقة على عقد "{n.title}"</span>
                    <span className="block text-xs text-slate">{formatDateTime(n.completed_at)}</span>
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
