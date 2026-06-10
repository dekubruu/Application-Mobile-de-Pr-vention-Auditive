import { useCallback, useEffect, useRef, useState } from 'react';
import { quizService } from '../services/quiz.service';
import { getCachedStats, setCachedStats } from '../services/quiz.storage';
import type { QuizStats } from '../types/quiz.types';

type Status = 'loading' | 'ready' | 'error';

// Cache-first strategy:
//   1. On userId CHANGE: synchronously clear stale state from the previous
//      user (no cross-user leak between A→B on a shared device).
//   2. On mount AND every refresh: read the cache for this user. If present,
//      surface it immediately as `stats` with status='ready'. The dashboard
//      renders instantly without waiting on a Supabase round-trip.
//   3. Always trigger a background refresh against Supabase. On success,
//      replace the visible stats and update the cache.
//   4. On refresh failure: if we already have cached stats visible, stay
//      silent (the user sees the cached numbers, no error spam). Only when
//      no cache at all → status='error'.
//   5. Concurrent refresh() calls (e.g. onSaved + onRefresh racing) are
//      guarded by a monotonic request id. Stale responses are discarded.
export function useQuizStats(userId: string | null | undefined) {
  const [stats, setStats]   = useState<QuizStats | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError]   = useState<string | null>(null);

  // Monotonic request id. Every refresh() call captures the next value, then
  // checks it against the current ref before applying its results. A response
  // that arrives after a newer call has started is silently dropped.
  const reqIdRef = useRef(0);

  // Capture userId at hook level so React's useCallback can observe its change
  // (and so the effect's clear-state pass runs synchronously on userId flips).
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const refresh = useCallback(async () => {
    const myReqId = ++reqIdRef.current;
    const capturedUserId = userIdRef.current;

    if (!capturedUserId) {
      if (reqIdRef.current !== myReqId) return;
      setStats(null);
      setStatus('ready');
      setError(null);
      return;
    }

    // Surface the cache instantly if available.
    let hasCache = false;
    const envelope = await getCachedStats(capturedUserId);
    if (reqIdRef.current !== myReqId) return; // superseded
    if (envelope) {
      hasCache = true;
      setStats(envelope.stats);
      setStatus('ready');
      setError(null);
    } else {
      setStatus('loading');
      setError(null);
    }

    try {
      const fresh = await quizService.fetchStats(capturedUserId);
      if (reqIdRef.current !== myReqId) return; // superseded
      setStats(fresh);
      setStatus('ready');
      setError(null);
      setCachedStats(capturedUserId, fresh).catch(() => { /* swallow */ });
    } catch (err) {
      if (reqIdRef.current !== myReqId) return; // superseded
      // If we surfaced a cache, keep showing it silently.
      if (hasCache) return;
      const msg = err instanceof Error ? err.message : 'Erreur réseau.';
      setError(msg);
      setStatus('error');
    }
  }, []);

  // On userId change, clear stale state SYNCHRONOUSLY before the async refresh
  // can yield. This prevents user A's numbers from being visible in user B's
  // first render. We also invalidate any in-flight requests by bumping reqId.
  useEffect(() => {
    reqIdRef.current++;
    setStats(null);
    setError(null);
    setStatus(userId ? 'loading' : 'ready');
    refresh();
  }, [userId, refresh]);

  return { stats, status, error, refresh };
}
