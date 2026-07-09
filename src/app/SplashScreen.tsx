import { useEffect, useState } from 'react';
import { FileSignature, ShieldCheck, PenLine } from 'lucide-react';

const SESSION_KEY = 'iqrar-splash-shown';
const DURATION_MS = 5000;

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
          <ShieldCheck size={88} className="absolute -left-20 top-0 animate-[iqrar-float_3s_ease-in-out_infinite] text-seal/20 sm:-left-36" />
          <PenLine size={76} className="absolute -right-16 bottom-0 animate-[iqrar-float_3s_ease-in-out_infinite_0.6s] text-seal/20 sm:-right-32" />
        </div>

        <div className="mb-8 flex h-28 w-28 animate-[iqrar-pop_0.6s_ease-out] items-center justify-center rounded-[2rem] bg-seal shadow-2xl sm:h-32 sm:w-32">
          <FileSignature size={56} className="text-white sm:size-16" />
        </div>
        <h1 className="mb-4 animate-[iqrar-rise_0.6s_ease-out_0.15s_both] font-display text-5xl font-extrabold text-ink sm:text-7xl">منصة إقرار</h1>
        <p className="animate-[iqrar-rise_0.6s_ease-out_0.35s_both] text-xl font-bold text-seal sm:text-3xl">
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
