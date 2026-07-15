import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { formatDateTime } from '@/shared/lib/formatDate';
import { fetchSmsTemplates, updateSmsTemplate, type SmsTemplate } from '../api/smsApi';

function TemplateCard({ template, onSaved }: { template: SmsTemplate; onSaved: (updated: SmsTemplate) => void }) {
  const [body, setBody] = useState(template.body);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const dirty = body !== template.body;

  const save = async () => {
    setError('');
    setSuccess(false);
    setSaving(true);
    try {
      await updateSmsTemplate(template.key, body);
      onSaved({ ...template, body, updated_at: new Date().toISOString() });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر حفظ القالب');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-line p-3">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-ink">{template.label}</p>
        <span className="text-xs text-slate">آخر تعديل: {formatDateTime(template.updated_at)}</span>
      </div>
      {template.description && <p className="mb-2 text-xs text-slate">{template.description}</p>}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        dir="rtl"
        className="w-full rounded-lg border border-line bg-card px-3 py-2 text-ink outline-none focus:border-seal"
      />
      {error && <p className="mt-2 text-xs font-bold text-clay">{error}</p>}
      {success && <p className="mt-2 text-xs font-bold text-sage">تم الحفظ</p>}
      <div className="mt-2">
        <Button onClick={save} disabled={!dirty || saving}>
          <span className="flex items-center gap-1.5">
            <Save size={14} /> {saving ? 'جارِ الحفظ...' : 'حفظ'}
          </span>
        </Button>
      </div>
    </div>
  );
}

export function SmsTemplatesSection() {
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSmsTemplates()
      .then(setTemplates)
      .catch((err) => setError(err instanceof Error ? err.message : 'تعذّر تحميل القوالب'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-xl border border-line bg-card p-5">
      <h2 className="mb-1 font-display text-sm font-bold text-ink">قوالب الرسائل التلقائية</h2>
      <p className="mb-4 text-xs text-slate">
        هذه الرسائل تُرسَل تلقائيًا من النظام (ليست جزءًا من الإرسال اليدوي أعلاه). عدّل أي قالب ثم احفظه — التغيير يسري فورًا على
        الرسائل القادمة.
      </p>
      {loading && <p className="text-sm text-slate">جارِ التحميل...</p>}
      {error && <p className="text-sm font-bold text-clay">{error}</p>}
      <div className="space-y-3">
        {templates.map((t) => (
          <TemplateCard
            key={t.key}
            template={t}
            onSaved={(updated) => setTemplates((prev) => prev.map((p) => (p.key === updated.key ? updated : p)))}
          />
        ))}
      </div>
    </div>
  );
}
