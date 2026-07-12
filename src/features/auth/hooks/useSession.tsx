import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';
import { fetchCurrentProfile } from '../api/authApi';
import type { Profile } from '../types';

interface SessionState {
  loading: boolean;
  profile: Profile | null;
}

interface SessionContextValue extends SessionState {
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

// كان كل مكوّن يستدعي useSession() ينشئ اشتراك onAuthStateChange ونداء
// fetchCurrentProfile خاصّين به بشكل مستقل — عند وجود عدة مكوّنات مستهلِكة للجلسة
// على نفس الصفحة (مثلًا AppShell + معالج إنشاء عقد)، أو عند أي حدث مصادقة واحد
// (تجديد الرمز، دخول، خروج)، كانت الطلبات تتضاعف بعدد المكوّنات — وهو ما تسبّب في
// الحجم الكبير للطلبات الملحوظ في لوحة سوبابيس. الحل: مصدر جلسة واحد فعليًا
// (SessionProvider) يُغلَّف حول التطبيق مرة واحدة، وuseSession() الآن مجرّد
// مستهلك لهذا السياق المشترك بدل نسخة مستقلة من نفس المنطق.
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ loading: true, profile: null });

  const refresh = useCallback(async () => {
    const profile = await fetchCurrentProfile();
    setState({ loading: false, profile });
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  return <SessionContext.Provider value={{ ...state, refresh }}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
