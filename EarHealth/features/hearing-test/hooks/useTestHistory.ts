import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getHearingTestHistory, type StoredHearingTestRow } from '../services/HearingResultService';
import type { HearingTestType, HFRTPayload, PTTPayload } from '../services/hearing.storage';
import type { HearingCategory } from '../types/hearing-test.types';

// A flat, view-ready representation of one stored test — enough to render a
// history row and to feed the evolution chart, without re-deriving payloads
// in the screen. The full payload is fetched again (by id) only when opening
// the detail screen.
export interface HistoryEntry {
  id:              string;
  createdAt:       string;
  testType:        HearingTestType;
  score:           number;              // 0-100, unified across types
  category:        HearingCategory;
  // PTT-specific
  ptaDb?:          number;              // internal dB (offset applied at render)
  // HFRT-specific
  maxFrequencyHz?: number;
  hitCeiling?:     boolean;
  interpretation?: string;
}

export type HistoryFilter = 'all' | 'ptt' | 'hfrt';

// Same thresholds as the dashboard so badges/colours read consistently.
function scoreToCategory(score: number): HearingCategory {
  if (score >= 80) return 'normal';
  if (score >= 60) return 'mild';
  if (score >= 40) return 'moderate';
  return 'severe';
}

function rowToEntry(row: StoredHearingTestRow): HistoryEntry {
  const score = row.overall_score ?? 0;
  const base = {
    id:        row.id,
    createdAt: row.created_at,
    testType:  row.test_type,
    score,
    category:  scoreToCategory(score),
  } as const;

  if (row.test_type === 'ptt') {
    const ears  = (row.payload as PTTPayload | undefined)?.ears ?? [];
    const left  = ears.find(e => e.ear === 'left');
    const right = ears.find(e => e.ear === 'right');
    const ptaDb = left && right
      ? Math.round((left.avgDb + right.avgDb) / 2)
      : left?.avgDb ?? right?.avgDb ?? 0;
    return { ...base, ptaDb };
  }

  const payload = row.payload as HFRTPayload | undefined;
  return {
    ...base,
    maxFrequencyHz: payload?.maxFrequencyHz,
    hitCeiling:     payload?.hitCeiling,
    interpretation: payload?.interpretation,
  };
}

export interface TestHistoryData {
  loading: boolean;
  entries: HistoryEntry[];   // newest first
  refresh: () => void;
}

// Fetches the full history (not just the dashboard's last 10). The generous
// cap is a safety backstop, not real pagination — a single user's test count
// stays far below it in practice.
const HISTORY_FETCH_LIMIT = 500;

export function useTestHistory(): TestHistoryData {
  const { session }             = useAuth();
  const [loading, setLoading]   = useState(true);
  const [entries, setEntries]   = useState<HistoryEntry[]>([]);

  const load = useCallback(async () => {
    if (!session?.user?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const rows = await getHearingTestHistory(session.user.id, HISTORY_FETCH_LIMIT);
      setEntries(rows.map(rowToEntry));
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => { load(); }, [load]);

  return { loading, entries, refresh: load };
}
