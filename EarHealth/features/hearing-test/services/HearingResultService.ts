import { supabase } from '@/src/utils/supabase';
import type { FrequencyThreshold, HearingTestSavePayload } from '../types/hearing-test.types';

// ── Score ─────────────────────────────────────────────────────────────────────
// 0 dB (perfect) → 100 pts; 80 dB (severe) → ~12 pts. Linear above 0 dB.

export function calculateHearingScore(avgDb: number): number {
  return Math.max(0, Math.min(100, Math.round(100 - avgDb * 1.1)));
}

export function averageDb(results: FrequencyThreshold[]): number {
  if (!results.length) return 0;
  return Math.round(results.reduce((s, r) => s + r.dbLevel, 0) / results.length);
}

// ── High-frequency loss detection ─────────────────────────────────────────────
// HF loss: avg(4k, 8k) exceeds avg(250, 500, 1k) by more than 15 dB.

export function detectHFLoss(results: FrequencyThreshold[]): boolean {
  const at = (f: number) => results.find(r => r.frequency === f)?.dbLevel ?? null;
  const lf = [250, 500, 1000].map(at).filter((v): v is number => v !== null);
  const hf = [4000, 8000].map(at).filter((v): v is number => v !== null);
  if (!lf.length || !hf.length) return false;
  const lfAvg = lf.reduce((a, b) => a + b, 0) / lf.length;
  const hfAvg = hf.reduce((a, b) => a + b, 0) / hf.length;
  return (hfAvg - lfAvg) > 15;
}

// ── Supabase persistence ───────────────────────────────────────────────────────

export async function saveHearingTestResult(
  userId:  string,
  payload: HearingTestSavePayload,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('hearing_test_results')
    .insert({
      user_id:        userId,
      test_mode:      payload.testMode,
      headset_id:     payload.headsetId,
      left_ear_data:  payload.leftEarData,
      right_ear_data: payload.rightEarData,
      mono_data:      payload.monoData,
      left_avg_db:    payload.leftAvgDb,
      right_avg_db:   payload.rightAvgDb,
      mono_avg_db:    payload.monoAvgDb,
      left_score:     payload.leftScore,
      right_score:    payload.rightScore,
      false_pos_ratio: payload.falsePosRatio,
      reliable:       payload.reliable,
      ambient_db:     payload.ambientDb,
    })
    .select('id')
    .single();

  if (error) {
    console.warn('[HearingResultService] save failed:', error.message);
    return null;
  }
  return (data as any)?.id ?? null;
}

export async function getHearingTestHistory(
  userId: string,
  limit   = 10,
): Promise<any[]> {
  const { data, error } = await supabase
    .from('hearing_test_results')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[HearingResultService] fetch failed:', error.message);
    return [];
  }
  return data ?? [];
}
