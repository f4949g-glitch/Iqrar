import { useEffect, useState } from 'react';
import { Lightbulb, AlertTriangle, Wrench, Mail } from 'lucide-react';
import { formatDate } from '@/shared/lib/formatDate';
import { listContactMessages, markContactMessageRead, type ContactCategory, type ContactMessage } from '../api/contactMessagesApi';

const CATEGORY_META: Record<ContactCategory, { label: string; icon: typeof Lightbulb; className: string }> = {
  suggestion: { label: 'اقتراح', icon: Lightbulb, className: 'bg-sageLight text-sage' },
  complaint: { label: 'شكوى', icon: AlertTriangle, className: 'bg-clayLight text-clay' },
  technical_issue: { label: 'مشكلة تقنية', icon: Wrench, className: 'bg-sealLight text-seal' },
};

export function CustomerServicePage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | ContactCategory>('all');

  const load = async () => {
    setLoading(true);
    try {
      setMessages(await listContactMessages());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تحميل رسائل خدمة العملاء');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id: string) => {
    await markContactMessageRead(id);
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: 'read' } : m)));
  };

  const visible = filter === 'all' ? messages : messages.filter((m) => m.category === filter);
  const newCount = messages.filter((m) => m.status === 'new').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">خدمة العملاء</h1>
        <p className="mt-1 text-sm text-slate">رسائل "اتصل بنا" المرسلة من المستخدمين — اقتراحات وشكاوى ومشاكل تقنية{newCount > 0 && ` (${newCount} جديدة)`}.</p>
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-lg bg-paper p-1">
        {(['all', 'suggestion', 'complaint', 'technical_issue'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${filter === f ? 'bg-card text-ink shadow-sm' : 'text-slate'}`}
          >
            {f === 'all' ? 'الكل' : CATEGORY_META[f].label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm font-bold text-clay">{error}</p>}
      {loading && <p className="text-sm text-slate">جارِ التحميل...</p>}

      <div className="space-y-3">
        {visible.map((m) => {
          const meta = CATEGORY_META[m.category];
          const Icon = meta.icon;
          return (
            <div key={m.id} className={`rounded-xl border p-4 ${m.status === 'new' ? 'border-seal/40 bg-sealLight/20' : 'border-line bg-card'}`}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.className}`}>
                    <Icon size={13} /> {meta.label}
                  </span>
                  {m.status === 'new' && <span className="rounded-full bg-seal px-2 py-0.5 text-[11px] font-bold text-white">جديدة</span>}
                </div>
                <p className="text-xs text-slate">{formatDate(m.created_at)}</p>
              </div>
              <p className="text-sm font-bold text-ink">{m.name}</p>
              {m.email && (
                <a href={`mailto:${m.email}`} className="mt-0.5 flex items-center gap-1 text-xs text-seal hover:underline" dir="ltr">
                  <Mail size={12} /> {m.email}
                </a>
              )}
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{m.message}</p>
              {m.status === 'new' && (
                <button
                  type="button"
                  onClick={() => markRead(m.id)}
                  className="mt-3 rounded-lg bg-line px-2.5 py-1 text-xs font-bold text-slate hover:bg-paper"
                >
                  وضع علامة كمقروءة
                </button>
              )}
            </div>
          );
        })}
        {!loading && visible.length === 0 && <p className="text-sm text-slate">لا توجد رسائل</p>}
      </div>
    </div>
  );
}
