import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/src/utils/supabase';
import { quizService } from '@/features/quiz/services/quiz.service';
import { flushPendingHearingResults } from '@/features/hearing-test/services/HearingResultService';
import { profileService } from '../services/profile.service';
import type { Profile } from '../types/auth.types';

// ── Fire-and-forget flush of any locally-queued data ────────────────────────
// CONTRACT: this helper MUST NOT throw and MUST NOT return a rejected promise
// under any circumstance. It catches every error path silently so that a flush
// failure can never cascade into the auth provider.
//
// Two queues are flushed in parallel (quiz + hearing-test). Each feature owns
// its own module-level single-flight guard so internal serialization is intact;
// the two flushes proceed independently.
function fireFlush(userId: string | null): void {
  if (!userId) return;
  try {
    void quizService.flushPendingSessions(userId).catch(() => { /* silent */ });
    void flushPendingHearingResults(userId).catch(() => { /* silent */ });
  } catch {
    /* silent: defensive guard if even the call site somehow throws */
  }
}

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Track previous AppState so we only flush on background→active, not on
  // every single 'change' emission (which can include duplicates).
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const data = await profileService.getProfile(userId);
      setProfile(data);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        if (session) {
          fetchProfile(session.user.id).finally(() => setLoading(false));
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // ── Quiz queue flush: cold start + foreground return ────────────────────
  // STRICT fire-and-forget. fireFlush() never throws and never rejects, so
  // this effect cannot impact the auth provider's behavior in any way.
  //
  // Dep is `session?.user.id` (NOT the whole `session` object). Supabase emits
  // a new Session reference on every TOKEN_REFRESHED event (~hourly); depending
  // on the object identity would re-run this effect on every refresh, causing
  // a spurious flush burst each time.
  const userId = session?.user.id ?? null;
  useEffect(() => {
    // 1) Cold-start flush: once the session is known, try to drain the queue.
    fireFlush(userId);

    // 2) Foreground flush: AppState transitions from background/inactive to
    //    active are our cheapest "user is back" signal (NetInfo is not
    //    installed by design — task scope forbids adding it).
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const wasInBackground = /inactive|background/.test(appStateRef.current);
      appStateRef.current = next;
      if (wasInBackground && next === 'active') {
        fireFlush(userId);
      }
    });

    return () => { sub.remove(); };
  }, [userId]);

  const refreshProfile = useCallback(async () => {
    if (session?.user.id) await fetchProfile(session.user.id);
  }, [session, fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ session, profile, loading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
};
