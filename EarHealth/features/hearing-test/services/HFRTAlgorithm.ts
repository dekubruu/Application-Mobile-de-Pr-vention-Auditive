import type {
  HFRTResult,
  HFRTReversalPoint,
  HFRTRuntimeState,
} from '../types/hfrt.types';

// ── Tunable parameters ────────────────────────────────────────────────────────

export const HFRT_START_FREQ        = 5000;
export const HFRT_MIN_FREQ          = 250;
export const HFRT_MAX_FREQ          = 20_000;
// Two-phase staircase (mirrors PTT): coarse "search" factors until the 1st
// reversal, then fine "track" factors to oscillate around the audible limit.
export const HFRT_SEARCH_HOLD_FACTOR    = 1.1;  // +6 % per tick when held (coarse climb)
export const HFRT_SEARCH_RELEASE_FACTOR = 0.97;  // -3 % per tick when released (coarse drop)
export const HFRT_TRACK_HOLD_FACTOR     = 1.02;  // +2 % per tick when held (fine climb)
export const HFRT_TRACK_RELEASE_FACTOR  = 0.98;  // -2 % per tick when released (fine drop)
export const HFRT_TICK_MS           = 280;    // tick (smooth ramp)
export const HFRT_TONE_GUARD_MS     = 250;
export const HFRT_REVERSALS_TARGET  = 5;      // converge after N reversals
export const HFRT_MAX_DURATION_MS   = 60_000; // safety timeout
export const HFRT_VOLUME            = 0.18;   // fixed comfortable volume

// ── State factory ─────────────────────────────────────────────────────────────

export function makeInitialRuntimeState(): HFRTRuntimeState {
  return {
    currentFreq: HFRT_START_FREQ,
    reversals: [],
    lastTransition: null,
    startedAt: 0,
  };
}

// ── Per-tick factor selection ─────────────────────────────────────────────────
// Phase 1 (no reversal yet) : coarse asymmetric factors for fast convergence.
// Phase 2 (≥ 1 reversal)    : fine factors to oscillate around the threshold.
export function getFactorsForPhase(reversalCount: number): {
  hold: number;
  release: number;
} {
  if (reversalCount === 0) {
    return { hold: HFRT_SEARCH_HOLD_FACTOR, release: HFRT_SEARCH_RELEASE_FACTOR };
  }
  return { hold: HFRT_TRACK_HOLD_FACTOR, release: HFRT_TRACK_RELEASE_FACTOR };
}

// ── Per-tick frequency adjustment ─────────────────────────────────────────────
// Multiplicative (logarithmic) ramp — perceptually smoother than additive Hz.
export function adjustFrequency(
  currentFreq: number,
  isHeld: boolean,
  reversalCount: number,
): number {
  const factors = getFactorsForPhase(reversalCount);
  const next = isHeld
    ? currentFreq * factors.hold
    : currentFreq * factors.release;
  return Math.min(HFRT_MAX_FREQ, Math.max(HFRT_MIN_FREQ, next));
}

// ── Record a transition ───────────────────────────────────────────────────────

export function recordTransition(
  reversals: HFRTReversalPoint[],
  lastTransition: 'hold' | 'release' | null,
  newTransition: 'hold' | 'release',
  currentFreq: number,
  atMs: number,
): { reversals: HFRTReversalPoint[]; isReversal: boolean } {
  if (lastTransition === null || lastTransition === newTransition) {
    return { reversals, isReversal: false };
  }
  const direction: HFRTReversalPoint['direction'] =
    newTransition === 'release' ? 'hold-to-release' : 'release-to-hold';
  return {
    reversals: [...reversals, { frequency: currentFreq, direction, atMs }],
    isReversal: true,
  };
}

// ── Convergence check ─────────────────────────────────────────────────────────

export function hasConverged(state: HFRTRuntimeState, nowMs: number): boolean {
  if (state.reversals.length >= HFRT_REVERSALS_TARGET) return true;
  if (state.currentFreq >= HFRT_MAX_FREQ - 1)          return true;
  if (state.startedAt > 0 && nowMs - state.startedAt > HFRT_MAX_DURATION_MS) return true;
  return false;
}

// ── Compute max audible frequency ─────────────────────────────────────────────
// Defined as the geometric mean of the last 2 "hold-to-release" reversals
// (i.e. frequencies at which the user lost perception). Falls back to last
// reversal of any direction, or to currentFreq if no reversal occurred.
export function computeMaxFrequency(state: HFRTRuntimeState): number {
  if (state.reversals.length === 0) return Math.round(state.currentFreq);

  const loss = state.reversals.filter(r => r.direction === 'hold-to-release');
  const pool = loss.length >= 2 ? loss : state.reversals;
  const last = pool.slice(-2);
  const logSum = last.reduce((acc, r) => acc + Math.log(r.frequency), 0);
  return Math.round(Math.exp(logSum / last.length));
}

// ── Build the final result ────────────────────────────────────────────────────

export function buildResult(state: HFRTRuntimeState, nowMs: number): HFRTResult {
  const maxAudibleFrequency = computeMaxFrequency(state);
  const timeout  = state.startedAt > 0 && nowMs - state.startedAt > HFRT_MAX_DURATION_MS;
  const reliable = state.reversals.length >= HFRT_REVERSALS_TARGET && !timeout;
  return {
    maxAudibleFrequency,
    reversals: state.reversals,
    reliable,
    durationMs: state.startedAt > 0 ? nowMs - state.startedAt : 0,
  };
}

// ── Interpretation helper ─────────────────────────────────────────────────────
// Rough age-based reference for high-frequency hearing limit.
// Used only as a UX hint, not a diagnostic.
export function interpretMaxFrequency(maxHz: number): {
  label: string;
  hint:  string;
} {
  if (maxHz >= 17_000) return { label: 'Excellente',  hint: 'Limite typique des < 24 ans.' };
  if (maxHz >= 15_000) return { label: 'Très bonne',  hint: 'Limite typique des < 30 ans.' };
  if (maxHz >= 13_000) return { label: 'Bonne',       hint: 'Limite typique des 30–40 ans.' };
  if (maxHz >= 11_000) return { label: 'Correcte',    hint: 'Limite typique des 40–50 ans.' };
  if (maxHz >= 9_000)  return { label: 'Réduite',     hint: 'Limite typique des 50–60 ans.' };
  return { label: 'Limitée', hint: 'Une consultation audiologique est recommandée.' };
}
