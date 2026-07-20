import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { Button } from '@/shared/ui/Button';
import { formatDateTime } from '@/shared/lib/formatDate';
import { sendAdminEmail, fetchEmailHistory, type EmailMessage } from '../api/emailApi';

const STATUS_BADGE: Record<EmailMessage['status'], { label: string; className: string }> = {
  sent: { label: 'أُرسلت', className: 'bg-sageLight text-sage' },
  failed: { label: 'فشل الإرسال', className: 'bg-clayLight text-clay' },
};

export function SendEmailPage() {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [history, setHistory] = useState<EmailMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      setHistory(await fetchEmailHistory());
      setHistoryError('');
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : 'تعذّر تحميل سجل الرسائل');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const send = async () => {
    setError('');
    setSuccess('');
    if (!email || !subject.trim() || !message.trim()) {
      setError('البريد الإلكتروني والعنوان والنص مطلوبة');
      return;
    }
    setSending(true);
    try {
      await sendAdminEmail(email, subject.trim(), message.trim());
      setSuccess('أُرسلت الرسالة بنجاح');
      setSubject('');
      setMessage('');
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر إرسال الرسالة');
      await loadHistory();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">إرسال بريد إلكتروني</h1>
        <p className="mt-1 text-sm text-slate">إرسال بريد إلكتروني مباشر لأي عنوان عبر بوابة البريد، مع سجل الرسائل السابقة.</p>
      </div>

      <form
        className="rounded-xl border border-line bg-card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!sending) send();
        }}
      >
        <h2 className="mb-4 font-display text-sm font-bold text-ink">رسالة جديدة</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="البريد الإلكتروني" value={email} onChange={setEmail} type="email" required />
          <Field label="عنوان الرسالة" value={subject} onChange={setSubject} required />
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-bold text-ink">نص الرسالة</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={5000}
              rows={6}
              className="w-full rounded-lg border border-line bg-card px-3 py-2 text-ink outline-none focus:border-seal"
            />
            <span className="mt-1 block text-xs text-slate">{message.length} / 5000 حرفًا</span>
          </label>
        </div>
        {error && <p className="mt-3 text-sm font-bold text-clay">{error}</p>}
        {success && <p className="mt-3 text-sm font-bold text-sage">{success}</p>}
        <div className="mt-4">
          <Button type="submit" disabled={sending}>
            <span className="flex items-center gap-1.5">
              <Send size={16} /> {sending ? 'جارِ الإرسال...' : 'إرسال'}
            </span>
          </Button>
        </div>
      </form>

      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="mb-4 font-display text-sm font-bold text-ink">سجل الرسائل السابقة</h2>
        {historyLoading && <p className="text-sm text-slate">جارِ التحميل...</p>}
        {historyError && <p className="text-sm font-bold text-clay">{historyError}</p>}
        <div className="space-y-2">
          {history.map((m) => {
            const badge = STATUS_BADGE[m.status];
            return (
              <div key={m.id} className="rounded-lg border border-line p-3">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-ink" dir="ltr">
                    {m.recipient_email}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${badge.className}`}>{badge.label}</span>
                    <span className="text-xs text-slate">{formatDateTime(m.created_at)}</span>
                  </div>
                </div>
                <p className="text-xs font-bold text-slate">{m.subject}</p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink">{m.message}</p>
                {m.status === 'failed' && m.error_detail && <p className="mt-1 text-xs text-clay">السبب: {m.error_detail}</p>}
              </div>
            );
          })}
          {!historyLoading && history.length === 0 && <p className="text-sm text-slate">لا توجد رسائل مُرسَلة بعد</p>}
        </div>
      </div>
    </div>
  );
}
