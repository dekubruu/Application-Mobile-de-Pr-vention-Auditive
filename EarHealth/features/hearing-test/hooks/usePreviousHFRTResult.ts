import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getPreviousHFRTResult } from '../services/HearingResultService';
import type { HFRTPayload } from '../services/hearing.storage';

// The max audible frequency (Hz) from the HFRT test immediately preceding
// `beforeIso`, for the spectrum chart's "previous visit" marker. Pass null
// while there is nothing to compare against yet.
export function usePreviousHFRTResult(beforeIso: string | null): number | null {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const [previousMaxHz, setPreviousMaxHz] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    setPreviousMaxHz(null);
    if (!userId || !beforeIso) return;

    getPreviousHFRTResult(userId, beforeIso).then(row => {
      if (!alive || !row) return;
      setPreviousMaxHz((row.payload as HFRTPayload).maxFrequencyHz ?? null);
    });

    return () => { alive = false; };
  }, [userId, beforeIso]);

  return previousMaxHz;
}
