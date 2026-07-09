import { useEffect, useState } from 'react';
import { FileSignature, ShieldCheck, PenLine } from 'lucide-react';

const SESSION_KEY = 'iqrar-splash-shown';
const DURATION_MS = 3000;

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 400);
    }, DURATION_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-hero transition-opacity duration-500 ${visible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      dir="rtl"
    >
      <div className="relative flex flex-col items-center px-4 text-center">
        <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
          <ShieldCheck size={64} className="absolute -left-16 top-2 animate-[iqrar-float_3s_ease-in-out_infinite] text-seal/20 sm:-left-28" />
          <PenLine size={56} className="absolute -right-14 bottom-4 animate-[iqrar-float_3s_ease-in-out_infinite_0.6s] text-seal/20 sm:-right-24" />
        </div>

        <div className="mb-6 flex h-20 w-20 animate-[iqrar-pop_0.6s_ease-out] items-center justify-center rounded-3xl bg-seal shadow-xl">
          <FileSignature size={38} className="text-white" />
        </div>
        <h1 className="mb-2 animate-[iqrar-rise_0.6s_ease-out_0.15s_both] font-display text-3xl font-extrabold text-ink sm:text-4xl">منصة إقرار</h1>
        <p className="animate-[iqrar-rise_0.6s_ease-out_0.35s_both] text-base font-bold text-seal sm:text-lg">
          حلّك الأمثل لتوثيق عقودك
        </p>
      </div>

      <style>{`
        @keyframes iqrar-pop {
          0% { transform: scale(0.4); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes iqrar-rise {
          0% { transform: translateY(12px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes iqrar-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}

export function shouldShowSplash(): boolean {
  if (typeof window === 'undefined') return false;
  return !window.sessionStorage.getItem(SESSION_KEY);
}

export function markSplashShown(): void {
  window.sessionStorage.setItem(SESSION_KEY, '1');
}
