import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { WHATSAPP_NUMBER } from '@/shared/lib/contactInfo';
import { fetchSiteSettings } from '@/features/site/api/siteSettingsApi';

export function WhatsAppButton() {
  const [number, setNumber] = useState(WHATSAPP_NUMBER);

  useEffect(() => {
    fetchSiteSettings()
      .then((s) => {
        if (s.whatsapp_number) setNumber(s.whatsapp_number);
      })
      .catch(() => {});
  }, []);

  return (
    <a
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="تواصل عبر واتساب"
      className="fixed bottom-5 left-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105"
    >
      <MessageCircle size={24} />
    </a>
  );
}
