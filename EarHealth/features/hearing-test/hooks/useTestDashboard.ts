import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getHearingTestHistory, type StoredHearingTestRow } from '../services/HearingResultService';
import type {
  HearingTestType,
  HFRTPayload,
  PTTPayload,
} from '../services/hearing.storage';
import type { HearingCategory } from '../types/hearing-test.types';

export interface TestHistoryItem {
  id:              string;
  createdAt:       string;
  testType:        HearingTestType;
  score:           number;             // 0-100, unified across types
  category:        HearingCategory;
  // PTT-specific
  ptaDb?:          number;             // mean of (left.avgDb + right.avgDb) / 2
  // HFRT-specific
  maxFrequencyHz?: number;
  interpretation?: string;
  hitCeiling?:     boolean;
}

export interface DashboardData {
  loading:      boolean;
  history:      TestHistoryItem[];
  lastScore:    number | null;
  avgScore:     number | null;
  testCount:    number;
  trend:        'up' | 'down' | 'stable' | 'none';
  lastTestDate: Date | null;
  lastCategory: HearingCategory | null;
  refresh:      () => void;
}

// Unified score → category mapping. Identical thresholds across PTT and HFRT
// so the dashboard reads consistently regardless of test type.
function scoreToCategory(score: number): HearingCategory {
  if (score >= 80) return 'normal';
  if (score >= 60) return 'mild';
  if (score >= 40) return 'moderate';
  return 'severe';
}

function rowToHistoryItem(row: StoredHearingTestRow): TestHistoryItem {
  const score = row.overall_score ?? 0;
  const base = {
    id:        row.id,
    createdAt: row.created_at,
    testType:  row.test_type,
    score,
    category:  scoreToCategory(score),
  } as const;

  if (row.test_type === 'ptt') {
    // Defensive: tolerate a malformed/legacy row instead of throwing inside .map().
    const ears  = (row.payload as PTTPayload | undefined)?.ears ?? [];
    const left  = ears.find(e => e.ear === 'left');
    const right = ears.find(e => e.ear === 'right');
    const ptaDb = left && right
      ? Math.round((left.avgDb + right.avgDb) / 2)
      : left?.avgDb ?? right?.avgDb ?? 0;
    return { ...base, ptaDb };
  }

  // hfrt
  const payload = row.payload as HFRTPayload | undefined;
  return {
    ...base,
    maxFrequencyHz: payload?.maxFrequencyHz,
    interpretation: payload?.interpretation,
    hitCeiling:     payload?.hitCeiling,
  };
}

export function useTestDashboard(): DashboardData {
  const { session }               = useAuth();
  const [loading,   setLoading]   = useState(true);
  const [history,   setHistory]   = useState<TestHistoryItem[]>([]);
  const [testCount, setTestCount] = useState(0);

  const load = useCallback(async () => {
    if (!session?.user?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const rows = await getHearingTestHistory(session.user.id, 10);
      setTestCount(rows.length);
      setHistory(rows.map(rowToHistoryItem));
    } finally {
      // Always clear loading, even if a corrupt/legacy row throws during mapping.
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => { load(); }, [load]);

  const lastScore    = history[0]?.score    ?? null;
  const lastCategory = history[0]?.category ?? null;
  const lastTestDate = history[0] ? new Date(history[0].createdAt) : null;
  const avgScore     = history.length
    ? Math.round(history.reduce((s, h) => s + h.score, 0) / history.length)
    : null;

  let trend: DashboardData['trend'] = 'none';
  if (history.length >= 2) {
    const diff = history[0].score - history[1].score;
    trend = diff > 3 ? 'up' : diff < -3 ? 'down' : 'stable';
  }

  return { loading, history, lastScore, avgScore, testCount, trend, lastTestDate, lastCategory, refresh: load };
}
