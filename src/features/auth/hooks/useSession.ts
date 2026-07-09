import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { fetchCurrentProfile } from '../api/authApi';
import type { Profile } from '../types';

interface SessionState {
  loading: boolean;
  profile: Profile | null;
}

export function useSession() {
  const [state, setState] = useState<SessionState>({ loading: true, profile: null });

  const refresh = useCallback(async () => {
    const profile = await fetchCurrentProfile();
    setState({ loading: false, profile });
  }, []);

  useEffect(() => {
    refresh();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  return { ...state, refresh };
}
