import { dbToVolume } from '../constants/hearing-test.constants';
import type {
  PTTFrequencyResult,
  PTTReversalPoint,
  PTTRuntimeState,
} from '../types/ptt.types';

// ── Tunable parameters ────────────────────────────────────────────────────────
// Approach: pulsed Békésy with modified Hughson-Westlake phases.
//   Phase 1 ("search"): asymmetric large steps (-10 hold / +5 release) until the
//   first reversal, for fast convergence.
//   Phase 2 ("track"):  fine symmetric steps (±3 dB) around the threshold for
//   stable averaging.

export const PTT_FREQUENCIES        = [500, 1000, 2000, 4000];
export const PTT_START_DB           = 40;     // initial volume per frequency
// PTT_MIN_DB is intentionally negative: the dB scale here is a software
// attenuation relative to DB_REFERENCE, NOT calibrated dB HL. A good ear can
// detect tones below 0 software-dB, so the staircase needs to be able to
// descend further or it bottoms out and never converges. The dbToVolume floor
// keeps the produced gain inaudible past ~-20 on a typical headset.
export const PTT_MIN_DB             = -20;
export const PTT_MAX_DB             = 80;

// Phase steps (search vs. track) — modified Hughson-Westlake
export const PTT_SEARCH_HOLD_DB    = 10;
export const PTT_SEARCH_RELEASE_DB = 5;
export const PTT_TRACK_HOLD_DB     = 3;
export const PTT_TRACK_RELEASE_DB  = 3;

// Pulsed tone (Békésy standard): 250 ms on / 350 ms off
export const PTT_PULSE_ON_MS        = 250;
export const PTT_PULSE_CYCLE_MS     = 600;    // also acts as decision tick
export const PTT_TONE_GUARD_MS      = 200;    // ignore responses within first 200 ms after start

// Convergence
export const PTT_REVERSALS_TARGET   = 6;      // accept after 6 reversals (1st discarded)
export const PTT_MAX_DURATION_MS    = 45_000; // safety timeout per frequency

// Inactivity detection
export const PTT_INACTIVITY_MS      = 8_000;  // no transition during this window → flag
export const PTT_INACTIVITY_GRACE_MS = 4_000; // don't flag during this initial period

// ── State factory ─────────────────────────────────────────────────────────────

export function makeInitialRuntimeState(): PTTRuntimeState {
  return {
    freqIndex: 0,
    currentDb: PTT_START_DB,
    reversals: [],
    presentations: 0,
    lastTransition: null,
    startedAt: 0,
  };
}

// ── Per-tick step selection ───────────────────────────────────────────────────
// Phase 1 (no reversal yet)  : asymmetric large steps for fast convergence.
// Phase 2 (≥ 1 reversal)     : symmetric fine steps for accurate threshold.
export function getStepsForPhase(reversalCount: number): {
  hold: number;
  release: number;
} {
  if (reversalCount === 0) {
    return { hold: PTT_SEARCH_HOLD_DB, release: PTT_SEARCH_RELEASE_DB };
  }
  return { hold: PTT_TRACK_HOLD_DB, release: PTT_TRACK_RELEASE_DB };
}

// ── Per-tick dB adjustment ────────────────────────────────────────────────────
export function adjustDb(
  currentDb: number,
  isHeld: boolean,
  reversalCount: number,
): number {
  const steps = getStepsForPhase(reversalCount);
  const next = isHeld
    ? currentDb - steps.hold
    : currentDb + steps.release;
  return Math.min(PTT_MAX_DB, Math.max(PTT_MIN_DB, next));
}

// ── Record a transition (hold ↔ release) ──────────────────────────────────────
// Returns the new reversals array and whether this counts as a reversal.
export function recordTransition(
  reversals: PTTReversalPoint[],
  lastTransition: 'hold' | 'release' | null,
  newTransition: 'hold' | 'release',
  currentDb: number,
  atMs: number,
): { reversals: PTTReversalPoint[]; isReversal: boolean } {
  if (lastTransition === null || lastTransition === newTransition) {
    return { reversals, isReversal: false };
  }
  const direction: PTTReversalPoint['direction'] =
    newTransition === 'release' ? 'hold-to-release' : 'release-to-hold';
  return {
    reversals: [...reversals, { db: currentDb, direction, atMs }],
    isReversal: true,
  };
}

// ── Convergence check ─────────────────────────────────────────────────────────
export function hasConverged(state: PTTRuntimeState, nowMs: number): boolean {
  if (state.reversals.length >= PTT_REVERSALS_TARGET) return true;
  if (state.startedAt > 0 && nowMs - state.startedAt > PTT_MAX_DURATION_MS) return true;
  return false;
}

// ── Inactivity check ──────────────────────────────────────────────────────────
// True if no transition has happened for INACTIVITY_MS, AND we're past the
// initial grace period since the frequency started.
export function isInactive(state: PTTRuntimeState, nowMs: number): boolean {
  if (state.startedAt === 0) return false;
  if (nowMs - state.startedAt < PTT_INACTIVITY_GRACE_MS) return false;

  const lastRev = state.reversals[state.reversals.length - 1];
  const lastActivityMs = lastRev ? lastRev.atMs : state.startedAt;
  return (nowMs - lastActivityMs) > PTT_INACTIVITY_MS;
}

// ── Compute threshold for one frequency ───────────────────────────────────────
// Classical Békésy: discard the 1st reversal, average the remaining reversal
// intensities. Reflects the user's stable tracking range around the threshold.
export function computeThresholdDb(reversals: PTTReversalPoint[]): number {
  if (reversals.length === 0) return PTT_START_DB;

  const usable = reversals.length >= 2 ? reversals.slice(1) : reversals;
  const sum    = usable.reduce((acc, r) => acc + r.db, 0);
  return Math.round(sum / usable.length);
}

// ── Build the per-frequency result ────────────────────────────────────────────
export function buildFrequencyResult(
  frequency: number,
  state: PTTRuntimeState,
  nowMs: number,
): PTTFrequencyResult {
  const thresholdDb = computeThresholdDb(state.reversals);
  const timeout     = state.startedAt > 0 && nowMs - state.startedAt > PTT_MAX_DURATION_MS;
  const reliable    = state.reversals.length >= PTT_REVERSALS_TARGET && !timeout;
  return {
    frequency,
    thresholdDb,
    reversals: state.reversals.length,
    presentations: state.presentations,
    reliable,
  };
}

// ── Volume helper exported for hooks ──────────────────────────────────────────
export { dbToVolume };

// ── PTA-4 (WHO): average of thresholds at 500, 1000, 2000, 4000 Hz ────────────
export function averageEarDb(results: PTTFrequencyResult[]): number {
  if (results.length === 0) return 0;
  const sum = results.reduce((acc, r) => acc + r.thresholdDb, 0);
  return Math.round(sum / results.length);
}
