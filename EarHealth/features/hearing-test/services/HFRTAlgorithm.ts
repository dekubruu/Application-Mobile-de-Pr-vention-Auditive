import type { HFRTResult, HFRTRuntimeState } from '../types/hfrt.types';

// ── Tunable parameters ────────────────────────────────────────────────────────
// High-frequency limit test — the PTT staircase transposed to the FREQUENCY axis:
//   • Hold "J'entends" (you hear the tone) → the frequency CLIMBS  (toward 20 kHz).
//   • Release (you don't hear it)          → the frequency DESCENDS (toward 8 kHz).
// The tone starts at 8 kHz. Each hold↔release change is a REVERSAL (basculement);
// after N reversals the audible limit is the GEOMETRIC mean of the reversals.
// Coarse steps until the tone is first lost going up, then fine steps (precision).

export const HFRT_START_FREQ = 8000;   // where the tone starts (and the low bound)
export const HFRT_MIN_FREQ   = 8000;   // floor of the band (kept for gauge / chart)
export const HFRT_MAX_FREQ   = 20_000; // ceiling (and most hardware's limit)

export const HFRT_VOLUME  = 0.18;      // fixed comfortable volume
export const HFRT_STEP_MS = 100;       // one staircase step (also the update period)

// Coarse "search" (until the first hold→release reversal), then fine "track".
export const HFRT_SEARCH_UP   = 1.018; // +1.8 % per step when held (slowed coarse climb)
export const HFRT_SEARCH_DOWN = 0.982; // -1.8 % per step when released
export const HFRT_TRACK_UP    = 1.012; // +1.2 % per step when held (fine)
export const HFRT_TRACK_DOWN  = 0.988; // -1.2 % per step when released (fine)

export const HFRT_REVERSALS_TARGET = 8;      // converge after N reversals (the "basculements")
export const HFRT_INACTIVITY_MS    = 6000;   // no reversal for this long → nudge the user
export const HFRT_STALL_MS         = 10_000; // no reversal for this long → finish (no dead-end)
export const HFRT_MAX_DURATION_MS  = 60_000; // absolute backstop

// ── State factory ─────────────────────────────────────────────────────────────
export function makeInitialRuntimeState(): HFRTRuntimeState {
  return {
    startedAt: 0,
    currentFreq: HFRT_START_FREQ,
    reversals: [],
    lastTransition: null,
    lastReversalAt: 0,
    everHeld: false,
    everLostTone: false,
    maxFreqWhileHeld: HFRT_START_FREQ,
  };
}

// ── Staircase step ────────────────────────────────────────────────────────────
// Multiplicative (log) step: held → up, released → down. Coarse until the first
// "lost the tone" reversal, then fine. Clamped to [8 kHz, 20 kHz].
export function adjustStaircaseFrequency(currentFreq: number, isHeld: boolean, isFine: boolean): number {
  const up   = isFine ? HFRT_TRACK_UP   : HFRT_SEARCH_UP;
  const down = isFine ? HFRT_TRACK_DOWN : HFRT_SEARCH_DOWN;
  const next = isHeld ? currentFreq * up : currentFreq * down;
  return Math.min(HFRT_MAX_FREQ, Math.max(HFRT_MIN_FREQ, next));
}

// A "reversal" (basculement) is a change of direction heard↔not-heard. We store
// the frequency at each reversal — these bracket the true audible limit.
export function recordReversal(
  reversals: number[],
  lastTransition: 'hold' | 'release' | null,
  newTransition: 'hold' | 'release',
  currentFreq: number,
): { reversals: number[]; isReversal: boolean } {
  if (lastTransition === null || lastTransition === newTransition) {
    return { reversals, isReversal: false };
  }
  return { reversals: [...reversals, Math.round(currentFreq)], isReversal: true };
}

// THE FORMULA (from the PTT): geometric mean of the reversal frequencies, discarding
// the 1st (the initial acquisition is biased, like the PTT's first reversal).
// Geometric because pitch is perceived logarithmically:
//   f_max = exp( (1/(n-1)) · Σ_{i=2..n} ln(f_i) )
export function computeRefinedFrequency(reversals: number[]): number | null {
  if (reversals.length === 0) return null;
  const usable = reversals.length >= 2 ? reversals.slice(1) : reversals;
  const logSum = usable.reduce((acc, f) => acc + Math.log(f), 0);
  return Math.round(Math.exp(logSum / usable.length));
}

// ── Build results ─────────────────────────────────────────────────────────────
export function buildRefinedResult(
  reversals: number[],
  fallbackFreq: number,
  durationMs: number,
): HFRTResult {
  const refined = computeRefinedFrequency(reversals) ?? fallbackFreq;
  const maxAudibleFrequency = Math.min(HFRT_MAX_FREQ, Math.max(HFRT_MIN_FREQ, Math.round(refined)));
  const reliable = reversals.length >= HFRT_REVERSALS_TARGET;
  return { maxAudibleFrequency, reliable, durationMs, hitCeiling: false, noResponse: false, reversals: reversals.length };
}

export function buildCeilingResult(durationMs: number): HFRTResult {
  return { maxAudibleFrequency: HFRT_MAX_FREQ, reliable: true, durationMs, hitCeiling: true, noResponse: false, reversals: 0 };
}

export function buildNoResponseResult(): HFRTResult {
  return { maxAudibleFrequency: HFRT_START_FREQ, reliable: false, durationMs: 0, hitCeiling: false, noResponse: true, reversals: 0 };
}

// ── Age helper (runtime-only: reads the current date) ─────────────────────────
export function computeAge(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  if (age < 0 || age > 120) return null;
  return age;
}

// ── Age-referenced expectation ────────────────────────────────────────────────
// HEURISTIC, non-diagnostic. Anchored ~17.5 kHz at 20 y/o, declining ~200 Hz/year.
function rawExpectedForAge(age: number): number {
  return 17_500 - (age - 20) * 200;
}

export function expectedMaxFrequencyForAge(age: number): number {
  return Math.min(HFRT_MAX_FREQ, Math.max(HFRT_MIN_FREQ, rawExpectedForAge(age)));
}

// Meaningful only where the expectation stays inside the measurable band (8–20 kHz).
export function isAgeModelMeaningful(age: number): boolean {
  const raw = rawExpectedForAge(age);
  return raw > HFRT_MIN_FREQ && raw < HFRT_MAX_FREQ;
}

// ── Interpretation (fixed thresholds — fallback when age is unknown) ──────────
export function interpretMaxFrequency(maxHz: number): { label: string; hint: string } {
  if (maxHz >= 17_000) return { label: 'Excellente',  hint: 'Limite typique des < 24 ans.' };
  if (maxHz >= 15_000) return { label: 'Très bonne',  hint: 'Limite typique des < 30 ans.' };
  if (maxHz >= 13_000) return { label: 'Bonne',       hint: 'Limite typique des 30–40 ans.' };
  if (maxHz >= 11_000) return { label: 'Correcte',    hint: 'Limite typique des 40–50 ans.' };
  if (maxHz >= 9_000)  return { label: 'Réduite',     hint: 'Limite typique des 50–60 ans.' };
  return { label: 'Limitée', hint: 'Une consultation audiologique est recommandée.' };
}

// ── Age-aware interpretation ──────────────────────────────────────────────────
export interface AgeAwareInterpretation {
  label: string;
  hint: string;
  expectedHz: number | null;
  relative: 'above' | 'typical' | 'below' | null;
}

export function interpretForAge(maxHz: number, age: number | null): AgeAwareInterpretation {
  if (age == null || !isAgeModelMeaningful(age)) {
    const fixed = interpretMaxFrequency(maxHz);
    return { label: fixed.label, hint: fixed.hint, expectedHz: null, relative: null };
  }
  const expectedHz = expectedMaxFrequencyForAge(age);
  const ratio = maxHz / expectedHz;
  const relative: 'above' | 'typical' | 'below' =
    ratio >= 1.06 ? 'above' : ratio <= 0.94 ? 'below' : 'typical';

  const expectedKHz = (expectedHz / 1000).toFixed(1);
  const label =
    relative === 'above'  ? 'Au-dessus de votre âge'
    : relative === 'below' ? 'En-dessous de votre âge'
    : 'Typique de votre âge';
  const hint =
    relative === 'above'
      ? `Meilleur que la moyenne attendue vers ${age} ans (~${expectedKHz} kHz).`
      : relative === 'below'
        ? `Sous la moyenne attendue vers ${age} ans (~${expectedKHz} kHz). Si cela se confirme, un avis audiologique est utile.`
        : `Conforme à la moyenne attendue vers ${age} ans (~${expectedKHz} kHz).`;
  return { label, hint, expectedHz, relative };
}

// ── Score ─────────────────────────────────────────────────────────────────────
export function hfrtScoreForAge(maxHz: number, age: number | null): number {
  if (age == null || !isAgeModelMeaningful(age)) {
    return Math.round(Math.min(100, Math.max(0, (maxHz / HFRT_MAX_FREQ) * 100)));
  }
  const expectedHz = expectedMaxFrequencyForAge(age);
  const ratio = maxHz / expectedHz;
  return Math.round(Math.min(100, Math.max(0, ratio * 85)));
}
