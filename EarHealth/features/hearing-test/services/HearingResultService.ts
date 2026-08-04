import * as Crypto from 'expo-crypto';
import { supabase } from '@/src/utils/supabase';
import {
  enqueuePendingResult,
  listPendingResults,
  removePendingResult,
  type HearingFlushOutcome,
  type HearingPayload,
  type HearingResilientSaveOutcome,
  type HearingTestType,
  type PendingHearingResult,
  type PTTPayload,
} from './hearing.storage';
import type { FrequencyThreshold } from '../types/hearing-test.types';
import type { PTTEarResult } from '../types/ptt.types';

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers (kept from the legacy service — still used by useTestDashboard
// and any future feature that needs to derive a dB → score / detect HF loss).
// ─────────────────────────────────────────────────────────────────────────────

// 0 dB (perfect) → 100 pts; 80 dB (severe) → ~12 pts. Linear above 0 dB.
export function calculateHearingScore(avgDb: number): number {
  return Math.max(0, Math.min(100, Math.round(100 - avgDb * 1.1)));
}

export function averageDb(results: FrequencyThreshold[]): number {
  if (!results.length) return 0;
  return Math.round(results.reduce((s, r) => s + r.dbLevel, 0) / results.length);
}

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

// ─────────────────────────────────────────────────────────────────────────────
// Supabase persistence
// ─────────────────────────────────────────────────────────────────────────────

// Module-level single-flight guard for flushPendingHearingResults.
// Distinct from the quiz feature's flushInFlight — the two queues are flushed
// in parallel but each is serialized within itself.
let flushInFlight = false;

// Private: idempotent upsert.
// `ignoreDuplicates: true` → `INSERT ... ON CONFLICT DO NOTHING`. There is no
// "bump points" trigger on hearing_test_results (the task explicitly forbids
// awarding points for tests), but the no-op semantics on conflict still buy
// us a clean retry story: replays of the same id never write twice.
async function persistResult(payload: {
  id:            string;
  user_id:       string;
  test_type:     HearingTestType;
  payload:       HearingPayload;
  overall_score: number;
}): Promise<void> {
  const { error } = await supabase
    .from('hearing_test_results')
    .upsert(payload, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw error;
}

// ── Resilient save ──
//
// Guarantee: the result is durable BEFORE any network call. If the app is
// killed between gameEnded and the Supabase response, the row will be
// re-pushed by the next flush (app launch or foreground return).
//
// Idempotency: the `id` is generated ONCE here. On retry, we use the same id
// and rely on persistResult's `ON CONFLICT DO NOTHING` to no-op.
//
// Errors:
//   - AsyncStorage failure (enqueue throws) → THROWN to caller. Hook sets
//     saveStatus='error'. This is the only catastrophic path.
//   - Network/Supabase failure (persist throws) → CAUGHT, returns 'queued'.
//     The row stays in the local queue and the next flush will retry.
export async function saveHearingResultResilient(
  userId:       string,
  testType:     HearingTestType,
  payload:      HearingPayload,
  overallScore: number,
): Promise<HearingResilientSaveOutcome> {
  const id = Crypto.randomUUID();

  const queued: PendingHearingResult = {
    id,
    user_id:       userId,
    test_type:     testType,
    payload,
    overall_score: overallScore,
    queued_at:     new Date().toISOString(),
  };

  // 1) Durability first: must succeed before any network attempt.
  await enqueuePendingResult(queued);

  // 2) Try to push immediately. Do NOT throw on network failure — that's the
  //    whole point of the queue.
  try {
    await persistResult({
      id:            queued.id,
      user_id:       queued.user_id,
      test_type:     queued.test_type,
      payload:       queued.payload,
      overall_score: queued.overall_score,
    });
  } catch {
    return { status: 'queued', id };
  }

  // 3) Persist succeeded. Cleanup is best-effort — if removePendingResult
  //    fails (transient AsyncStorage hiccup), the next flush will retry and
  //    ON CONFLICT DO NOTHING makes the duplicate upsert a server-side no-op.
  //    We do NOT mis-report 'queued' here — the data IS in Supabase.
  await removePendingResult(id).catch(() => { /* swallowed: self-healing */ });
  return { status: 'synced', id };
}

// ── Flush queue ──
//
// Single-flight: a concurrent call returns immediately with skipped=true.
// Scope: only rows belonging to `currentUserId` are processed (multi-user
// device safety). Errors per row are NEVER propagated.
//
// Callers MUST fire-and-forget. The only path that throws is AsyncStorage
// itself being unreadable on the initial listPendingResults.
export async function flushPendingHearingResults(
  currentUserId: string | null,
): Promise<HearingFlushOutcome> {
  if (flushInFlight) {
    return { flushed: 0, remaining: 0, skipped: true };
  }
  if (!currentUserId) {
    return { flushed: 0, remaining: 0, skipped: false };
  }

  flushInFlight = true;
  try {
    const all    = await listPendingResults();
    const mine   = all.filter(r => r.user_id === currentUserId);
    const others = all.length - mine.length;

    let flushed = 0;
    let stillPending = 0;

    for (const row of mine) {
      try {
        await persistResult({
          id:            row.id,
          user_id:       row.user_id,
          test_type:     row.test_type,
          payload:       row.payload,
          overall_score: row.overall_score,
        });
        await removePendingResult(row.id);
        flushed++;
      } catch {
        stillPending++;
      }
    }

    return { flushed, remaining: stillPending + others, skipped: false };
  } finally {
    flushInFlight = false;
  }
}

// ── History fetch ──

export interface StoredHearingTestRow {
  id:            string;
  user_id:       string;
  created_at:    string;
  test_type:     HearingTestType;
  payload:       HearingPayload;
  overall_score: number | null;
}

export async function getHearingTestHistory(
  userId: string,
  limit   = 10,
): Promise<StoredHearingTestRow[]> {
  const { data, error } = await supabase
    .from('hearing_test_results')
    .select('id, user_id, created_at, test_type, payload, overall_score')
    .eq('user_id', userId)
    .in('test_type', ['ptt', 'hfrt'])
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[HearingResultService] fetch failed:', error.message);
    return [];
  }
  return (data ?? []) as StoredHearingTestRow[];
}

// Single row by id. Scoped to the owner (RLS also enforces this server-side).
// Returns null on absence or error — the detail screen renders a "not found"
// state rather than throwing.
export async function getHearingTestById(
  userId: string,
  id:     string,
): Promise<StoredHearingTestRow | null> {
  const { data, error } = await supabase
    .from('hearing_test_results')
    .select('id, user_id, created_at, test_type, payload, overall_score')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.warn('[HearingResultService] fetch by id failed:', error.message);
    return null;
  }
  return (data as StoredHearingTestRow | null) ?? null;
}

// The PTT test taken immediately before `before` (exclusive), for the
// audiogram's "previous visit" comparison overlay. `before` should be
// captured client-side at the moment results are shown — since the new
// test's own `created_at` is assigned server-side on save, it is always
// later than any client timestamp captured before that save was even
// requested, so this can't race with the just-completed test.
export async function getPreviousPTTResult(
  userId: string,
  before: string,
): Promise<StoredHearingTestRow | null> {
  const { data, error } = await supabase
    .from('hearing_test_results')
    .select('id, user_id, created_at, test_type, payload, overall_score')
    .eq('user_id', userId)
    .eq('test_type', 'ptt')
    .lt('created_at', before)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[HearingResultService] fetch previous PTT failed:', error.message);
    return null;
  }
  return (data as StoredHearingTestRow | null) ?? null;
}

// Stored PTT payload → view-model. The stored payload keeps only {freq, db}
// per point (no per-frequency reliability/reversals), so history-sourced
// results are always marked reliable — the "~" flag is only meaningful for
// a just-completed test.
export function pttPayloadToEarResults(payload: PTTPayload): PTTEarResult[] {
  return payload.ears.map(e => ({
    ear:    e.ear,
    avgDb:  e.avgDb,
    thresholds: e.thresholds.map(t => ({
      frequency:     t.freq,
      thresholdDb:   t.db,
      reversals:     0,
      presentations: 0,
      reliable:      true,
    })),
  }));
}
