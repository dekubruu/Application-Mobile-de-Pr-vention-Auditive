import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getHearingCategory } from '../constants/hearing-test.constants';
import { calculateHearingScore, getHearingTestHistory } from '../services/HearingResultService';
import type { HearingCategory } from '../types/hearing-test.types';

export interface TestHistoryItem {
  id:         string;
  createdAt:  string;
  testMode:   'headset' | 'speaker';
  score:      number;
  category:   HearingCategory;
  leftScore:  number | null;
  rightScore: number | null;
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

function rowToScore(row: any): number {
  if (row.test_mode === 'speaker') {
    return row.mono_avg_db != null ? calculateHearingScore(Math.round(row.mono_avg_db)) : 0;
  }
  const scores = [row.left_score, row.right_score].filter((s: any): s is number => s != null);
  return scores.length
    ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
    : 0;
}

function rowToCategory(row: any): HearingCategory {
  if (row.test_mode === 'speaker') {
    return getHearingCategory(row.mono_avg_db ?? 0);
  }
  const dbs = [row.left_avg_db, row.right_avg_db].filter((v: any): v is number => v != null);
  const avg = dbs.length ? dbs.reduce((a: number, b: number) => a + b, 0) / dbs.length : 0;
  return getHearingCategory(avg);
}

export function useTestDashboard(): DashboardData {
  const { session }               = useAuth();
  const [loading,   setLoading]   = useState(true);
  const [history,   setHistory]   = useState<TestHistoryItem[]>([]);
  const [testCount, setTestCount] = useState(0);

  const load = useCallback(async () => {
    if (!session?.user?.id) { setLoading(false); return; }
    setLoading(true);
    const rows = await getHearingTestHistory(session.user.id, 10);
    setTestCount(rows.length);
    setHistory(rows.map((row: any) => ({
      id:         row.id,
      createdAt:  row.created_at,
      testMode:   row.test_mode as 'headset' | 'speaker',
      score:      rowToScore(row),
      category:   rowToCategory(row),
      leftScore:  row.left_score  ?? null,
      rightScore: row.right_score ?? null,
    })));
    setLoading(false);
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
