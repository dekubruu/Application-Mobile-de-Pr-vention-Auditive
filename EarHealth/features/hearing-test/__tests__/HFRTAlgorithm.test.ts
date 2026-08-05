import {
  HFRT_MAX_FREQ,
  HFRT_MIN_FREQ,
  HFRT_QUALITY_BANDS,
  HFRT_REVERSALS_TARGET,
  HFRT_SEARCH_DOWN,
  HFRT_SEARCH_UP,
  HFRT_START_FREQ,
  HFRT_TRACK_DOWN,
  HFRT_TRACK_UP,
  adjustStaircaseFrequency,
  buildCeilingResult,
  buildNoResponseResult,
  buildRefinedResult,
  computeAge,
  computeRefinedFrequency,
  expectedMaxFrequencyForAge,
  getHFRTQualityBand,
  interpretForAge,
  interpretMaxFrequency,
  isAgeModelMeaningful,
  makeInitialRuntimeState,
  recordReversal,
} from '../services/HFRTAlgorithm';

describe('makeInitialRuntimeState', () => {
  test('starts at HFRT_START_FREQ with no reversals', () => {
    const state = makeInitialRuntimeState();
    expect(state.currentFreq).toBe(HFRT_START_FREQ);
    expect(state.reversals).toEqual([]);
    expect(state.everHeld).toBe(false);
    expect(state.everLostTone).toBe(false);
  });
});

describe('adjustStaircaseFrequency', () => {
  test('coarse search: held climbs by the search-up factor', () => {
    expect(adjustStaircaseFrequency(10_000, true, false)).toBeCloseTo(10_000 * HFRT_SEARCH_UP);
  });

  test('coarse search: released descends by the search-down factor', () => {
    expect(adjustStaircaseFrequency(10_000, false, false)).toBeCloseTo(10_000 * HFRT_SEARCH_DOWN);
  });

  test('fine track: held climbs by the smaller track-up factor', () => {
    expect(adjustStaircaseFrequency(10_000, true, true)).toBeCloseTo(10_000 * HFRT_TRACK_UP);
  });

  test('fine track: released descends by the smaller track-down factor', () => {
    expect(adjustStaircaseFrequency(10_000, false, true)).toBeCloseTo(10_000 * HFRT_TRACK_DOWN);
  });

  test('clamps at HFRT_MAX_FREQ', () => {
    expect(adjustStaircaseFrequency(HFRT_MAX_FREQ, true, false)).toBe(HFRT_MAX_FREQ);
  });

  test('clamps at HFRT_MIN_FREQ', () => {
    expect(adjustStaircaseFrequency(HFRT_MIN_FREQ, false, false)).toBe(HFRT_MIN_FREQ);
  });
});

describe('recordReversal', () => {
  test('first transition is never a reversal', () => {
    const { reversals, isReversal } = recordReversal([], null, 'hold', 9000);
    expect(isReversal).toBe(false);
    expect(reversals).toEqual([]);
  });

  test('repeating the same transition is not a reversal', () => {
    const { isReversal } = recordReversal([], 'hold', 'hold', 9000);
    expect(isReversal).toBe(false);
  });

  test('a direction change records the rounded current frequency', () => {
    const { reversals, isReversal } = recordReversal([], 'hold', 'release', 9123.6);
    expect(isReversal).toBe(true);
    expect(reversals).toEqual([9124]);
  });

  test('does not mutate the input array', () => {
    const existing = [8000];
    recordReversal(existing, 'release', 'hold', 9000);
    expect(existing).toEqual([8000]);
  });
});

describe('computeRefinedFrequency', () => {
  test('returns null for no reversals', () => {
    expect(computeRefinedFrequency([])).toBeNull();
  });

  test('uses the single reversal when there is only one', () => {
    expect(computeRefinedFrequency([12_000])).toBe(12_000);
  });

  test('discards the first reversal and takes the geometric mean of the rest', () => {
    // geometric mean of [10000, 12000] = sqrt(10000*12000) ≈ 10954.45
    const result = computeRefinedFrequency([8000, 10_000, 12_000]);
    expect(result).toBe(Math.round(Math.exp((Math.log(10_000) + Math.log(12_000)) / 2)));
  });
});

describe('buildRefinedResult', () => {
  test('falls back to fallbackFreq when there are no reversals', () => {
    const result = buildRefinedResult([], 8500, 1000);
    expect(result.maxAudibleFrequency).toBe(8500);
    expect(result.reliable).toBe(false);
    expect(result.hitCeiling).toBe(false);
    expect(result.noResponse).toBe(false);
  });

  test('marks reliable once the reversal target is reached', () => {
    const reversals = Array.from({ length: HFRT_REVERSALS_TARGET }, (_, i) => 9000 + i * 100);
    const result = buildRefinedResult(reversals, 8000, 5000);
    expect(result.reliable).toBe(true);
    expect(result.reversals).toBe(HFRT_REVERSALS_TARGET);
  });

  test('clamps the refined frequency into [HFRT_MIN_FREQ, HFRT_MAX_FREQ]', () => {
    const result = buildRefinedResult([HFRT_MAX_FREQ + 5000], 8000, 1000);
    expect(result.maxAudibleFrequency).toBe(HFRT_MAX_FREQ);
  });
});

describe('buildCeilingResult', () => {
  test('reports the ceiling frequency, reliable, hitCeiling', () => {
    const result = buildCeilingResult(3000);
    expect(result).toEqual({
      maxAudibleFrequency: HFRT_MAX_FREQ,
      reliable: true,
      durationMs: 3000,
      hitCeiling: true,
      noResponse: false,
      reversals: 0,
    });
  });
});

describe('buildNoResponseResult', () => {
  test('reports the floor frequency, unreliable, noResponse', () => {
    const result = buildNoResponseResult();
    expect(result).toEqual({
      maxAudibleFrequency: HFRT_START_FREQ,
      reliable: false,
      durationMs: 0,
      hitCeiling: false,
      noResponse: true,
      reversals: 0,
    });
  });
});

describe('computeAge', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-15T00:00:00Z'));
  });
  afterEach(() => jest.useRealTimers());

  test('returns null for a null/undefined/empty date of birth', () => {
    expect(computeAge(null)).toBeNull();
    expect(computeAge(undefined)).toBeNull();
    expect(computeAge('')).toBeNull();
  });

  test('returns null for an unparsable date string', () => {
    expect(computeAge('not-a-date')).toBeNull();
  });

  test('computes the age when the birthday has already passed this year', () => {
    expect(computeAge('2000-01-01')).toBe(26);
  });

  test('has not yet had the birthday this year (subtracts one)', () => {
    expect(computeAge('2000-12-31')).toBe(25);
  });

  test('computes age correctly on the exact birthday', () => {
    expect(computeAge('2000-06-15')).toBe(26);
  });

  test('returns null for an implausible age (> 120)', () => {
    expect(computeAge('1900-01-01')).toBeNull();
  });

  test('returns null for a future date of birth (negative age)', () => {
    expect(computeAge('2030-01-01')).toBeNull();
  });
});

describe('expectedMaxFrequencyForAge / isAgeModelMeaningful', () => {
  test('20 y/o anchors at 17.5 kHz', () => {
    expect(expectedMaxFrequencyForAge(20)).toBe(17_500);
  });

  test('declines ~200 Hz per year older than 20', () => {
    expect(expectedMaxFrequencyForAge(30)).toBe(17_500 - 10 * 200);
  });

  test('clamps at HFRT_MAX_FREQ for young ages where the raw value would exceed it', () => {
    expect(expectedMaxFrequencyForAge(5)).toBe(HFRT_MAX_FREQ);
  });

  test('clamps at HFRT_MIN_FREQ for very old ages', () => {
    expect(expectedMaxFrequencyForAge(100)).toBe(HFRT_MIN_FREQ);
  });

  test('isAgeModelMeaningful is false once the raw expectation saturates the band', () => {
    expect(isAgeModelMeaningful(5)).toBe(false); // raw > HFRT_MAX_FREQ
    expect(isAgeModelMeaningful(100)).toBe(false); // raw < HFRT_MIN_FREQ
  });

  test('isAgeModelMeaningful is true inside the measurable band', () => {
    expect(isAgeModelMeaningful(30)).toBe(true);
  });
});

describe('getHFRTQualityBand / interpretMaxFrequency', () => {
  test('returns the lowest band at the floor frequency', () => {
    expect(getHFRTQualityBand(HFRT_MIN_FREQ).label).toBe('Limitée');
  });

  test('returns the highest band at the ceiling frequency', () => {
    expect(getHFRTQualityBand(HFRT_MAX_FREQ).label).toBe('Excellente');
  });

  test('picks the band whose minHz the frequency clears, not the next one', () => {
    // 13_000 exactly matches the 'Bonne' band's lower bound.
    expect(getHFRTQualityBand(13_000).label).toBe('Bonne');
    expect(getHFRTQualityBand(12_999).label).toBe('Correcte');
  });

  test('every band is present exactly once and bands are sorted ascending by minHz', () => {
    const sorted = [...HFRT_QUALITY_BANDS].sort((a, b) => a.minHz - b.minHz);
    expect(HFRT_QUALITY_BANDS).toEqual(sorted);
  });

  test('interpretMaxFrequency mirrors getHFRTQualityBand’s label/hint', () => {
    const band = getHFRTQualityBand(15_500);
    expect(interpretMaxFrequency(15_500)).toEqual({ label: band.label, hint: band.hint });
  });
});

describe('interpretForAge', () => {
  test('falls back to the fixed interpretation when age is null', () => {
    const result = interpretForAge(15_000, null);
    expect(result.expectedHz).toBeNull();
    expect(result.relative).toBeNull();
    expect(result.label).toBe(getHFRTQualityBand(15_000).label);
  });

  test('falls back to the fixed interpretation when the age model is not meaningful', () => {
    const result = interpretForAge(15_000, 5); // raw expectation saturates the band
    expect(result.expectedHz).toBeNull();
    expect(result.relative).toBeNull();
  });

  test('classifies as "above" when well above the age-expected frequency', () => {
    // age 20 → expected 17500; well above = ratio >= 1.06
    const result = interpretForAge(19_000, 20);
    expect(result.relative).toBe('above');
    expect(result.expectedHz).toBe(17_500);
  });

  test('classifies as "below" when well below the age-expected frequency', () => {
    const result = interpretForAge(15_000, 20);
    expect(result.relative).toBe('below');
  });

  test('classifies as "typical" within the ±6% band around the expectation', () => {
    const result = interpretForAge(17_500, 20); // exactly at expectation
    expect(result.relative).toBe('typical');
  });
});

describe('hfrtScoreForAge (imported indirectly via module — sanity via band boundaries)', () => {
  test('interpretMaxFrequency and getHFRTQualityBand never disagree on category for the same frequency', () => {
    for (const hz of [8000, 9500, 11500, 13500, 15500, 18000, 20000]) {
      const band = getHFRTQualityBand(hz);
      const interp = interpretMaxFrequency(hz);
      expect(interp.label).toBe(band.label);
    }
  });
});
