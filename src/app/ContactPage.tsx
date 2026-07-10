import { useEffect, useState } from 'react';
import { Mail, MessageCircle, Phone, Lightbulb, AlertTriangle, Wrench } from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { Button } from '@/shared/ui/Button';
import { WHATSAPP_NUMBER, CONTACT_EMAIL } from '@/shared/lib/contactInfo';
import { fetchSiteSettings } from '@/features/site/api/siteSettingsApi';
import { submitContactMessage, type ContactCategory } from '@/features/site/api/contactMessagesApi';

const CATEGORY_OPTIONS: { value: ContactCategory; label: string; icon: typeof Lightbulb }[] = [
  { value: 'suggestion', label: 'اقتراح', icon: Lightbulb },
  { value: 'complaint', label: 'شكوى', icon: AlertTriangle },
  { value: 'technical_issue', label: 'مشكلة تقنية', icon: Wrench },
];

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<ContactCategory>('suggestion');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [contactEmail, setContactEmail] = useState(CONTACT_EMAIL);
  const [contactPhone, setContactPhone] = useState<string | null>(null);

  useEffect(() => {
    fetchSiteSettings()
      .then((s) => {
        if (s.contact_email) setContactEmail(s.contact_email);
        if (s.contact_phone) setContactPhone(s.contact_phone);
      })
      .catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSubmitting(true);
    try {
      await submitContactMessage({ name, email: email || null, phone: null, category, message });
      setSuccess(true);
      setName('');
      setEmail('');
      setMessage('');
      setCategory('suggestion');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر إرسال الرسالة');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-ink">اتصل بنا</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border border-line bg-card p-4 shadow-sm hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sageLight">
            <MessageCircle size={18} className="text-sage" />
          </div>
          <div>
            <p className="text-sm font-bold text-ink">واتساب الأعمال</p>
            <p className="text-xs text-slate" dir="ltr">
              +{WHATSAPP_NUMBER}
            </p>
          </div>
        </a>
        <a href={`mailto:${contactEmail}`} className="flex items-center gap-3 rounded-xl border border-line bg-card p-4 shadow-sm hover:shadow-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sealLight">
            <Mail size={18} className="text-seal" />
          </div>
          <div>
            <p className="text-sm font-bold text-ink">البريد الإلكتروني (إرسال مباشر)</p>
            <p className="text-xs text-slate" dir="ltr">
              {contactEmail}
            </p>
          </div>
        </a>
        <a
          href={`tel:${contactPhone || WHATSAPP_NUMBER}`}
          className="flex items-center gap-3 rounded-xl border border-line bg-card p-4 shadow-sm hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-clayLight">
            <Phone size={18} className="text-clay" />
          </div>
          <div>
            <p className="text-sm font-bold text-ink">الهاتف</p>
            <p className="text-xs text-slate" dir="ltr">
              +{contactPhone || WHATSAPP_NUMBER}
            </p>
          </div>
        </a>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-card p-5">
        <h2 className="font-display text-sm font-bold text-ink">راسلنا</h2>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate">نوع الرسالة</label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORY_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                className={`flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-bold transition ${
                  category === value ? 'border-seal bg-sealLight text-seal' : 'border-line text-slate hover:bg-paper'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <Field label="الاسم" value={name} onChange={setName} required />
        <Field label="البريد الإلكتروني (اختياري)" value={email} onChange={setEmail} type="email" />
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate">الرسالة</label>
          <textarea
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-ink outline-none focus:border-seal"
          />
        </div>
        {error && <p className="text-sm font-bold text-clay">{error}</p>}
        {success && <p className="text-sm font-bold text-sage">تم إرسال رسالتك، سيتواصل معك فريق خدمة العملاء قريبًا</p>}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'جارِ الإرسال...' : 'إرسال'}
        </Button>
      </form>
    </div>
  );
}
