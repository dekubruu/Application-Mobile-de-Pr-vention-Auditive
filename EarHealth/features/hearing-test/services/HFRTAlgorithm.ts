import type { HFRTResult, HFRTRuntimeState } from '../types/hfrt.types';

// ── Tunable parameters ────────────────────────────────────────────────────────
// High-frequency limit test (extended HF, 8–20 kHz). A CONTINUOUS upward sweep:
// once the user starts holding, the tone glides smoothly from 8 kHz toward 20 kHz.
// The user holds while they still hear it and releases when it becomes inaudible;
// the frequency reached at that point is their max audible frequency.

export const HFRT_START_FREQ = 8000;   // sweep start — audible to virtually everyone
export const HFRT_MIN_FREQ   = 8000;   // low end of the displayed scale (chart / gauge)
export const HFRT_MAX_FREQ   = 20_000; // sweep end / ceiling (and most hardware's limit)

export const HFRT_SWEEP_DURATION_MS  = 15_000; // time to glide 8 → 20 kHz while held
export const HFRT_TICK_MS            = 50;      // update period (smooth glide)
export const HFRT_VOLUME             = 0.18;    // fixed comfortable volume

export const HFRT_NO_RESPONSE_MS     = 3500; // never held → no response (can't hear 8 kHz / bad setup)
export const HFRT_PROMPT_AFTER_MS    = 1500; // show a "hold to start" hint after this delay
export const HFRT_RELEASE_CONFIRM_MS = 500;  // sustained release after hearing = "lost it"

// ── State factory ─────────────────────────────────────────────────────────────
export function makeInitialRuntimeState(): HFRTRuntimeState {
  return {
    startedAt: 0,
    sweepStartedAt: 0,
    currentFreq: HFRT_START_FREQ,
    maxFreqWhileHeld: HFRT_START_FREQ,
    everHeld: false,
    releaseStartedAt: 0,
  };
}

// ── Continuous log sweep ──────────────────────────────────────────────────────
// Logarithmic (constant octaves per second) so the rise sounds perceptually even.
//   f(t) = START · (MAX / START)^(t / DURATION),   t clamped to [0, DURATION]
export function freqAtElapsed(elapsedMs: number): number {
  const t = Math.min(1, Math.max(0, elapsedMs / HFRT_SWEEP_DURATION_MS));
  return HFRT_START_FREQ * Math.pow(HFRT_MAX_FREQ / HFRT_START_FREQ, t);
}

// ── Build results ─────────────────────────────────────────────────────────────
// Normal / ceiling outcome. `maxFreqWhileHeld` is the highest frequency the user
// confirmed hearing; `hitCeiling` means they held all the way to 20 kHz.
export function buildSweepResult(
  maxFreqWhileHeld: number,
  hitCeiling: boolean,
  durationMs: number,
): HFRTResult {
  const clamped = Math.min(HFRT_MAX_FREQ, Math.max(HFRT_START_FREQ, Math.round(maxFreqWhileHeld)));
  const maxAudibleFrequency = hitCeiling ? HFRT_MAX_FREQ : clamped;
  // A release barely above the 8 kHz start is likely a mishit or an inaudible
  // start tone → flag for a retry. A genuine reading or a ceiling hit is reliable.
  const reliable = hitCeiling || maxAudibleFrequency > HFRT_START_FREQ + 300;
  return { maxAudibleFrequency, reliable, durationMs, hitCeiling, noResponse: false };
}

// No-response outcome: the user never perceived even the 8 kHz start tone.
export function buildNoResponseResult(): HFRTResult {
  return {
    maxAudibleFrequency: HFRT_START_FREQ,
    reliable: false,
    durationMs: 0,
    hitCeiling: false,
    noResponse: true,
  };
}

// ── Age helper (runtime-only: reads the current date) ─────────────────────────
// Kept here so the hook and the result view derive age identically.
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
// HEURISTIC, non-diagnostic. Presbycusis lowers the audible ceiling roughly
// linearly with age. Anchored ~17.5 kHz at 20 y/o, declining ~200 Hz/year.
function rawExpectedForAge(age: number): number {
  return 17_500 - (age - 20) * 200;
}

// Clamped to the test bounds — safe for display (chart marker, "expected" text).
export function expectedMaxFrequencyForAge(age: number): number {
  return Math.min(HFRT_MAX_FREQ, Math.max(HFRT_MIN_FREQ, rawExpectedForAge(age)));
}

// The linear model only carries information where its expectation stays strictly
// INSIDE the measurable band (≈ 8–67 y/o). Outside it, the expectation saturates
// against a bound and the relative verdict becomes meaningless → callers fall back
// to the absolute, fixed-threshold interpretation.
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
  expectedHz: number | null;                 // null when age unknown / model saturated
  relative: 'above' | 'typical' | 'below' | null;
}

export function interpretForAge(maxHz: number, age: number | null): AgeAwareInterpretation {
  // No age, or the age model has saturated against a test bound → fall back to
  // the absolute, fixed-threshold interpretation (no misleading relative verdict).
  if (age == null || !isAgeModelMeaningful(age)) {
    const fixed = interpretMaxFrequency(maxHz);
    return { label: fixed.label, hint: fixed.hint, expectedHz: null, relative: null };
  }
  const expectedHz = expectedMaxFrequencyForAge(age);
  const ratio = maxHz / expectedHz;                  // 1.0 = exactly the age norm
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
// Age-relative: matching your age norm ≈ 85, exceeding it climbs toward 100,
// below it drops. Falls back to the absolute ratio over the ceiling when age is
// unknown or the model has saturated.
export function hfrtScoreForAge(maxHz: number, age: number | null): number {
  if (age == null || !isAgeModelMeaningful(age)) {
    return Math.round(Math.min(100, Math.max(0, (maxHz / HFRT_MAX_FREQ) * 100)));
  }
  const expectedHz = expectedMaxFrequencyForAge(age);
  const ratio = maxHz / expectedHz;
  return Math.round(Math.min(100, Math.max(0, ratio * 85)));
}
