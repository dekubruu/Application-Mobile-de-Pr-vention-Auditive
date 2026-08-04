import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getPreviousPTTResult, pttPayloadToEarResults } from '../services/HearingResultService';
import type { PTTPayload } from '../services/hearing.storage';
import type { PTTEarResult } from '../types/ptt.types';

// The PTT test immediately preceding `beforeIso`, for the audiogram's
// "previous visit" overlay. Pass null while there is nothing to compare
// against yet (e.g. results not shown, or viewing a non-PTT test).
export function usePreviousPTTResult(beforeIso: string | null): PTTEarResult[] | null {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const [result, setResult] = useState<PTTEarResult[] | null>(null);

  useEffect(() => {
    let alive = true;
    setResult(null);
    if (!userId || !beforeIso) return;

    getPreviousPTTResult(userId, beforeIso).then(row => {
      if (!alive || !row) return;
      setResult(pttPayloadToEarResults(row.payload as PTTPayload));
    });

    return () => { alive = false; };
  }, [userId, beforeIso]);

  return result;
}
