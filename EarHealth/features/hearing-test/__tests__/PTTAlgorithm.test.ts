import {
  PTT_MAX_DB,
  PTT_MIN_DB,
  PTT_REVERSALS_TARGET,
  PTT_SEARCH_HOLD_DB,
  PTT_SEARCH_RELEASE_DB,
  PTT_START_DB,
  PTT_TRACK_HOLD_DB,
  PTT_TRACK_RELEASE_DB,
  adjustDb,
  averageEarDb,
  buildFrequencyResult,
  computeThresholdDb,
  getStepsForPhase,
  hasConverged,
  isInactive,
  makeInitialRuntimeState,
  recordTransition,
} from '../services/PTTAlgorithm';
import type { PTTFrequencyResult, PTTReversalPoint, PTTRuntimeState } from '../types/ptt.types';

describe('makeInitialRuntimeState', () => {
  test('returns a fresh state at the starting dB with no reversals', () => {
    const state = makeInitialRuntimeState();
    expect(state).toEqual({
      freqIndex: 0,
      currentDb: PTT_START_DB,
      reversals: [],
      presentations: 0,
      lastTransition: null,
      startedAt: 0,
    });
  });

  test('returns a new object each call (no shared mutable state)', () => {
    const a = makeInitialRuntimeState();
    const b = makeInitialRuntimeState();
    expect(a).not.toBe(b);
    expect(a.reversals).not.toBe(b.reversals);
  });
});

describe('getStepsForPhase', () => {
  test('uses coarse search steps when no reversal has happened yet', () => {
    expect(getStepsForPhase(0)).toEqual({ hold: PTT_SEARCH_HOLD_DB, release: PTT_SEARCH_RELEASE_DB });
  });

  test('uses fine track steps once at least one reversal has happened', () => {
    expect(getStepsForPhase(1)).toEqual({ hold: PTT_TRACK_HOLD_DB, release: PTT_TRACK_RELEASE_DB });
    expect(getStepsForPhase(6)).toEqual({ hold: PTT_TRACK_HOLD_DB, release: PTT_TRACK_RELEASE_DB });
  });
});

describe('adjustDb', () => {
  test('held: decreases by the search step before the first reversal', () => {
    expect(adjustDb(40, true, 0)).toBe(40 - PTT_SEARCH_HOLD_DB);
  });

  test('released: increases by the search step before the first reversal', () => {
    expect(adjustDb(40, false, 0)).toBe(40 + PTT_SEARCH_RELEASE_DB);
  });

  test('held: decreases by the fine track step after a reversal', () => {
    expect(adjustDb(20, true, 1)).toBe(20 - PTT_TRACK_HOLD_DB);
  });

  test('clamps at PTT_MAX_DB when released past the ceiling', () => {
    expect(adjustDb(PTT_MAX_DB, false, 0)).toBe(PTT_MAX_DB);
  });

  test('clamps at PTT_MIN_DB when held past the floor', () => {
    expect(adjustDb(PTT_MIN_DB, true, 1)).toBe(PTT_MIN_DB);
  });
});

describe('recordTransition', () => {
  test('first transition (lastTransition null) is never a reversal', () => {
    const { reversals, isReversal } = recordTransition([], null, 'hold', 40, 1000);
    expect(isReversal).toBe(false);
    expect(reversals).toEqual([]);
  });

  test('repeating the same transition is not a reversal', () => {
    const { reversals, isReversal } = recordTransition([], 'hold', 'hold', 40, 1000);
    expect(isReversal).toBe(false);
    expect(reversals).toEqual([]);
  });

  test('hold → release records a reversal with direction hold-to-release', () => {
    const { reversals, isReversal } = recordTransition([], 'hold', 'release', 35, 1500);
    expect(isReversal).toBe(true);
    expect(reversals).toEqual([{ db: 35, direction: 'hold-to-release', atMs: 1500 }]);
  });

  test('release → hold records a reversal with direction release-to-hold', () => {
    const { reversals, isReversal } = recordTransition([], 'release', 'hold', 30, 2000);
    expect(isReversal).toBe(true);
    expect(reversals).toEqual([{ db: 30, direction: 'release-to-hold', atMs: 2000 }]);
  });

  test('appends to existing reversals without mutating the input array', () => {
    const existing: PTTReversalPoint[] = [{ db: 40, direction: 'hold-to-release', atMs: 500 }];
    const { reversals } = recordTransition(existing, 'release', 'hold', 32, 900);
    expect(reversals).toHaveLength(2);
    expect(existing).toHaveLength(1); // original untouched
  });
});

describe('hasConverged', () => {
  const base: PTTRuntimeState = makeInitialRuntimeState();

  test('false when below the reversal target and within the time budget', () => {
    const state = { ...base, reversals: Array(PTT_REVERSALS_TARGET - 1).fill({ db: 0, direction: 'hold-to-release', atMs: 0 }), startedAt: 1000 };
    expect(hasConverged(state, 2000)).toBe(false);
  });

  test('true once the reversal target is reached', () => {
    const state = { ...base, reversals: Array(PTT_REVERSALS_TARGET).fill({ db: 0, direction: 'hold-to-release', atMs: 0 }) };
    expect(hasConverged(state, 0)).toBe(true);
  });

  test('true once the safety timeout elapses, regardless of reversal count', () => {
    const state = { ...base, startedAt: 1 };
    expect(hasConverged(state, 1 + 45_001)).toBe(true);
  });

  test('false when startedAt is 0 (not started) even past the nominal timeout', () => {
    // startedAt === 0 means "not started" — the elapsed check is skipped.
    const state = { ...base, startedAt: 0, reversals: [] };
    expect(hasConverged(state, 100_000)).toBe(false);
  });
});

describe('isInactive', () => {
  test('false before the test has started (startedAt === 0)', () => {
    const state = makeInitialRuntimeState();
    expect(isInactive(state, 999_999)).toBe(false);
  });

  test('false during the initial grace period', () => {
    const state = { ...makeInitialRuntimeState(), startedAt: 1000 };
    expect(isInactive(state, 1000 + 3999)).toBe(false); // grace = 4000ms
  });

  test('false once a recent reversal keeps activity within the inactivity window', () => {
    const state: PTTRuntimeState = {
      ...makeInitialRuntimeState(),
      startedAt: 0,
      reversals: [{ db: 30, direction: 'hold-to-release', atMs: 5000 }],
    };
    expect(isInactive({ ...state, startedAt: 1 }, 5000 + 7999)).toBe(false); // inactivity = 8000ms
  });

  test('true once past the grace period with no reversal at all', () => {
    const state = { ...makeInitialRuntimeState(), startedAt: 1000 };
    expect(isInactive(state, 1000 + 4000 + 8001)).toBe(true);
  });

  test('true once past the inactivity window since the last reversal', () => {
    const state: PTTRuntimeState = {
      ...makeInitialRuntimeState(),
      startedAt: 1,
      reversals: [{ db: 30, direction: 'hold-to-release', atMs: 5000 }],
    };
    expect(isInactive(state, 5000 + 8001)).toBe(true);
  });
});

describe('computeThresholdDb', () => {
  test('returns the starting dB when there are no reversals yet', () => {
    expect(computeThresholdDb([])).toBe(PTT_START_DB);
  });

  test('averages all reversals when there is only one (nothing to discard)', () => {
    const reversals: PTTReversalPoint[] = [{ db: 20, direction: 'hold-to-release', atMs: 0 }];
    expect(computeThresholdDb(reversals)).toBe(20);
  });

  test('discards the first reversal and averages the rest', () => {
    const reversals: PTTReversalPoint[] = [
      { db: 100, direction: 'hold-to-release', atMs: 0 },  // discarded (biased first reversal)
      { db: 10, direction: 'release-to-hold', atMs: 1 },
      { db: 20, direction: 'hold-to-release', atMs: 2 },
    ];
    expect(computeThresholdDb(reversals)).toBe(15); // avg(10, 20)
  });

  test('rounds to the nearest integer', () => {
    const reversals: PTTReversalPoint[] = [
      { db: 0, direction: 'hold-to-release', atMs: 0 },
      { db: 10, direction: 'release-to-hold', atMs: 1 },
      { db: 11, direction: 'hold-to-release', atMs: 2 },
    ];
    // usable = [10, 11] → avg 10.5 → rounds to 11 (banker's-free JS rounding)
    expect(computeThresholdDb(reversals)).toBe(11);
  });
});

describe('buildFrequencyResult', () => {
  test('marks the result reliable once the reversal target is hit within the time budget', () => {
    const state: PTTRuntimeState = {
      ...makeInitialRuntimeState(),
      startedAt: 0,
      reversals: Array.from({ length: PTT_REVERSALS_TARGET }, (_, i) => ({ db: 20, direction: 'hold-to-release' as const, atMs: i })),
      presentations: 12,
    };
    const result = buildFrequencyResult(1000, state, 5000);
    expect(result).toEqual<PTTFrequencyResult>({
      frequency: 1000,
      thresholdDb: 20,
      reversals: PTT_REVERSALS_TARGET,
      presentations: 12,
      reliable: true,
    });
  });

  test('marks the result unreliable when it timed out even with enough reversals', () => {
    const state: PTTRuntimeState = {
      ...makeInitialRuntimeState(),
      startedAt: 0,
      reversals: Array.from({ length: PTT_REVERSALS_TARGET }, () => ({ db: 20, direction: 'hold-to-release' as const, atMs: 0 })),
      presentations: 20,
    };
    // startedAt = 0 means "not started" for the timeout check, so force a real start.
    const started = { ...state, startedAt: 1 };
    const result = buildFrequencyResult(1000, started, 1 + 45_001);
    expect(result.reliable).toBe(false);
  });

  test('marks the result unreliable when below the reversal target', () => {
    const state: PTTRuntimeState = { ...makeInitialRuntimeState(), reversals: [{ db: 20, direction: 'hold-to-release', atMs: 0 }] };
    const result = buildFrequencyResult(500, state, 0);
    expect(result.reliable).toBe(false);
  });
});

describe('averageEarDb (PTA-4)', () => {
  test('returns 0 for an empty result set', () => {
    expect(averageEarDb([])).toBe(0);
  });

  test('averages and rounds the thresholds across frequencies', () => {
    const results: PTTFrequencyResult[] = [
      { frequency: 500, thresholdDb: 10, reversals: 6, presentations: 8, reliable: true },
      { frequency: 1000, thresholdDb: 15, reversals: 6, presentations: 8, reliable: true },
      { frequency: 2000, thresholdDb: 20, reversals: 6, presentations: 8, reliable: true },
      { frequency: 4000, thresholdDb: 25, reversals: 6, presentations: 8, reliable: true },
    ];
    expect(averageEarDb(results)).toBe(18); // avg(10,15,20,25) = 17.5 → rounds to 18
  });
});
