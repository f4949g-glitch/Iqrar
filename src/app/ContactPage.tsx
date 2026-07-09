import { useState } from 'react';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { Button } from '@/shared/ui/Button';
import { WHATSAPP_NUMBER, CONTACT_EMAIL } from '@/shared/lib/contactInfo';

export function ContactPage() {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const mailtoHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('تواصل من منصة إقرار')}&body=${encodeURIComponent(
    `الاسم: ${name}\n\n${message}`,
  )}`;

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
        <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-3 rounded-xl border border-line bg-card p-4 shadow-sm hover:shadow-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sealLight">
            <Mail size={18} className="text-seal" />
          </div>
          <div>
            <p className="text-sm font-bold text-ink">البريد الإلكتروني</p>
            <p className="text-xs text-slate" dir="ltr">
              {CONTACT_EMAIL}
            </p>
          </div>
        </a>
        <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-line bg-card p-4 shadow-sm hover:shadow-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-clayLight">
            <Phone size={18} className="text-clay" />
          </div>
          <div>
            <p className="text-sm font-bold text-ink">الهاتف</p>
            <p className="text-xs text-slate" dir="ltr">
              +{WHATSAPP_NUMBER}
            </p>
          </div>
        </a>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          window.location.href = mailtoHref;
        }}
        className="space-y-4 rounded-xl border border-line bg-card p-5"
      >
        <h2 className="font-display text-sm font-bold text-ink">راسلنا</h2>
        <Field label="الاسم" value={name} onChange={setName} required />
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
        <Button type="submit">إرسال</Button>
      </form>
    </div>
  );
}
