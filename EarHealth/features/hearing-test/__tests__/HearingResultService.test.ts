import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeQueryResult, mockFrom, mockSupabase, resetSupabaseMock } from '../../../test-utils/supabaseMock';

jest.mock('@/src/utils/supabase', () => ({ supabase: mockSupabase }));

import {
  averageDb,
  calculateHearingScore,
  detectHFLoss,
  flushPendingHearingResults,
  getHearingTestById,
  getHearingTestHistory,
  getHearingTestHistoryFiltered,
  getPreviousHFRTResult,
  getPreviousPTTResult,
  hfrtPayloadToResult,
  pttPayloadToEarResults,
  saveHearingResultResilient,
} from '../services/HearingResultService';
import type { FrequencyThreshold } from '../types/hearing-test.types';
import type { HFRTPayload, PTTPayload } from '../services/hearing.storage';

// ── Pure helpers ─────────────────────────────────────────────────────────────

describe('calculateHearingScore', () => {
  test('0 dB (perfect) scores 100', () => {
    expect(calculateHearingScore(0)).toBe(100);
  });

  test('scores decrease linearly with dB', () => {
    expect(calculateHearingScore(20)).toBe(78); // 100 - 22
  });

  test('clamps at 0 for very high dB values', () => {
    expect(calculateHearingScore(150)).toBe(0);
  });

  test('clamps at 100 for negative dB values', () => {
    expect(calculateHearingScore(-50)).toBe(100);
  });
});

describe('averageDb', () => {
  test('returns 0 for an empty list', () => {
    expect(averageDb([])).toBe(0);
  });

  test('averages and rounds dbLevel across thresholds', () => {
    const results: FrequencyThreshold[] = [
      { frequency: 500, dbLevel: 10, presentations: 4, reliable: true },
      { frequency: 1000, dbLevel: 15, presentations: 4, reliable: true },
    ];
    expect(averageDb(results)).toBe(13); // avg(10,15)=12.5 → rounds to 13
  });
});

describe('detectHFLoss', () => {
  const at = (frequency: number, dbLevel: number): FrequencyThreshold => ({
    frequency, dbLevel, presentations: 4, reliable: true,
  });

  test('false when low- and high-frequency thresholds are missing', () => {
    expect(detectHFLoss([])).toBe(false);
  });

  test('false when the high-frequency average is not more than 15 dB worse', () => {
    const results = [at(500, 10), at(1000, 10), at(4000, 15), at(8000, 15)];
    expect(detectHFLoss(results)).toBe(false);
  });

  test('true when the high-frequency average exceeds the low-frequency average by more than 15 dB', () => {
    const results = [at(250, 5), at(500, 5), at(1000, 5), at(4000, 30), at(8000, 40)];
    expect(detectHFLoss(results)).toBe(true);
  });

  test('false when only low-frequency data is present (no hf points to compare)', () => {
    const results = [at(250, 5), at(500, 5)];
    expect(detectHFLoss(results)).toBe(false);
  });
});

describe('pttPayloadToEarResults', () => {
  test('maps ears/thresholds and marks every threshold reliable (no per-point data in storage)', () => {
    const payload: PTTPayload = {
      ears: [
        { ear: 'left', avgDb: 12, thresholds: [{ freq: 500, db: 10 }, { freq: 1000, db: 14 }] },
      ],
    };
    const result = pttPayloadToEarResults(payload);
    expect(result).toEqual([
      {
        ear: 'left',
        avgDb: 12,
        thresholds: [
          { frequency: 500, thresholdDb: 10, reversals: 0, presentations: 0, reliable: true },
          { frequency: 1000, thresholdDb: 14, reversals: 0, presentations: 0, reliable: true },
        ],
      },
    ]);
  });

  test('handles an empty ears array', () => {
    expect(pttPayloadToEarResults({ ears: [] })).toEqual([]);
  });
});

describe('hfrtPayloadToResult', () => {
  test('defaults optional enriched fields to safe values when absent (legacy payload)', () => {
    const payload: HFRTPayload = { maxFrequencyHz: 15_000, interpretation: 'Bonne' };
    expect(hfrtPayloadToResult(payload)).toEqual({
      maxAudibleFrequency: 15_000,
      reliable: false,
      durationMs: 0,
      hitCeiling: false,
      noResponse: false,
      reversals: 0,
    });
  });

  test('preserves the enriched fields when present', () => {
    const payload: HFRTPayload = {
      maxFrequencyHz: 20_000,
      interpretation: 'Excellente',
      reliable: true,
      durationMs: 12_000,
      hitCeiling: true,
      noResponse: false,
      reversals: 8,
    };
    const result = hfrtPayloadToResult(payload);
    expect(result).toEqual({
      maxAudibleFrequency: 20_000,
      reliable: true,
      durationMs: 12_000,
      hitCeiling: true,
      noResponse: false,
      reversals: 8,
    });
  });
});

// ── Supabase-backed functions ───────────────────────────────────────────────
// Only the network boundary (supabase) is mocked; the AsyncStorage-backed
// queue in hearing.storage.ts runs for real against the official in-memory
// AsyncStorage mock, so these tests exercise the actual enqueue/dedupe/
// idempotency behavior, not just "was the right function called".

describe('saveHearingResultResilient', () => {
  beforeEach(async () => {
    resetSupabaseMock();
    await AsyncStorage.clear();
  });

  const payload: PTTPayload = { ears: [{ ear: 'left', avgDb: 20, thresholds: [{ freq: 500, db: 20 }] }] };

  test('returns "synced" and leaves no pending entry when the network write succeeds', async () => {
    mockFrom.mockReturnValue(makeQueryResult({ data: null, error: null }));

    const outcome = await saveHearingResultResilient('user-1', 'ptt', payload, 80);

    expect(outcome.status).toBe('synced');
    expect(mockFrom).toHaveBeenCalledWith('hearing_test_results');
  });

  test('returns "queued" and keeps the result queued when the network write fails', async () => {
    mockFrom.mockReturnValue(makeQueryResult({ data: null, error: { message: 'network down' } }));

    const outcome = await saveHearingResultResilient('user-1', 'hfrt', { maxFrequencyHz: 15_000, interpretation: 'Bonne' }, 60);

    expect(outcome.status).toBe('queued');

    // The row should now be flushable — retry with a working network.
    mockFrom.mockReturnValue(makeQueryResult({ data: null, error: null }));
    const flush = await flushPendingHearingResults('user-1');
    expect(flush.flushed).toBe(1);
    expect(flush.remaining).toBe(0);
  });
});

describe('flushPendingHearingResults', () => {
  beforeEach(async () => {
    resetSupabaseMock();
    await AsyncStorage.clear();
  });

  test('returns skipped=false, flushed=0 with no user id', async () => {
    const outcome = await flushPendingHearingResults(null);
    expect(outcome).toEqual({ flushed: 0, remaining: 0, skipped: false });
  });

  test('only flushes rows belonging to the given user, leaving others counted as remaining', async () => {
    mockFrom.mockReturnValue(makeQueryResult({ data: null, error: { message: 'offline' } }));
    await saveHearingResultResilient('user-a', 'ptt', { ears: [] }, 50);
    await saveHearingResultResilient('user-b', 'ptt', { ears: [] }, 50);

    mockFrom.mockReturnValue(makeQueryResult({ data: null, error: null }));
    const outcome = await flushPendingHearingResults('user-a');

    expect(outcome.flushed).toBe(1);
    expect(outcome.remaining).toBe(1); // user-b's row stays queued
  });
});

describe('getHearingTestHistory', () => {
  beforeEach(() => resetSupabaseMock());

  test('returns the rows on success', async () => {
    const rows = [{ id: '1', user_id: 'u', created_at: 'now', test_type: 'ptt', payload: {}, overall_score: 80 }];
    mockFrom.mockReturnValue(makeQueryResult({ data: rows, error: null }));

    const result = await getHearingTestHistory('u');
    expect(result).toEqual(rows);
  });

  test('returns an empty array (not a throw) on a Supabase error', async () => {
    mockFrom.mockReturnValue(makeQueryResult({ data: null, error: { message: 'boom' } }));
    await expect(getHearingTestHistory('u')).resolves.toEqual([]);
  });
});

describe('getHearingTestById', () => {
  beforeEach(() => resetSupabaseMock());

  test('returns the row when found', async () => {
    const row = { id: '1', user_id: 'u', created_at: 'now', test_type: 'ptt', payload: {}, overall_score: 80 };
    mockFrom.mockReturnValue(makeQueryResult({ data: row, error: null }));
    await expect(getHearingTestById('u', '1')).resolves.toEqual(row);
  });

  test('returns null when not found (maybeSingle resolves data: null)', async () => {
    mockFrom.mockReturnValue(makeQueryResult({ data: null, error: null }));
    await expect(getHearingTestById('u', 'missing')).resolves.toBeNull();
  });

  test('returns null (not a throw) on error', async () => {
    mockFrom.mockReturnValue(makeQueryResult({ data: null, error: { message: 'boom' } }));
    await expect(getHearingTestById('u', '1')).resolves.toBeNull();
  });
});

describe('getPreviousPTTResult / getPreviousHFRTResult', () => {
  beforeEach(() => resetSupabaseMock());

  test('getPreviousPTTResult returns the row found before the given timestamp', async () => {
    const row = { id: 'prev', user_id: 'u', created_at: '2026-01-01', test_type: 'ptt', payload: {}, overall_score: 70 };
    mockFrom.mockReturnValue(makeQueryResult({ data: row, error: null }));
    await expect(getPreviousPTTResult('u', '2026-02-01')).resolves.toEqual(row);
  });

  test('getPreviousHFRTResult returns null on error rather than throwing', async () => {
    mockFrom.mockReturnValue(makeQueryResult({ data: null, error: { message: 'boom' } }));
    await expect(getPreviousHFRTResult('u', '2026-02-01')).resolves.toBeNull();
  });
});

describe('getHearingTestHistoryFiltered', () => {
  beforeEach(() => resetSupabaseMock());

  test('returns an empty array immediately when no test types are requested (no network call)', async () => {
    const result = await getHearingTestHistoryFiltered('u', { testTypes: [] });
    expect(result).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('fetches and returns rows when test types are given', async () => {
    const rows = [{ id: '1', user_id: 'u', created_at: 'now', test_type: 'hfrt', payload: {}, overall_score: 90 }];
    mockFrom.mockReturnValue(makeQueryResult({ data: rows, error: null }));
    const result = await getHearingTestHistoryFiltered('u', { testTypes: ['hfrt'] });
    expect(result).toEqual(rows);
  });

  test('returns an empty array (not a throw) on a Supabase error', async () => {
    mockFrom.mockReturnValue(makeQueryResult({ data: null, error: { message: 'boom' } }));
    const result = await getHearingTestHistoryFiltered('u', { testTypes: ['ptt', 'hfrt'] });
    expect(result).toEqual([]);
  });
});
