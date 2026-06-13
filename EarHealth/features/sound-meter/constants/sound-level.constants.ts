export interface SoundLevelCategory {
  max: number;
  label: string;
  color: string;
  description: string;
}

export const SOUND_LEVEL_CATEGORIES: SoundLevelCategory[] = [
  {
    max: 40,
    label: 'Silencieux',
    color: '#16A34A',
    description: 'Bibliothèque, chuchotement, bruit de feuilles. Sûr pour une exposition prolongée.',
  },
  {
    max: 70,
    label: 'Modéré',
    color: '#2563EB',
    description: 'Conversation normale, bureau calme. Généralement sûr pour une exposition prolongée.',
  },
  {
    max: 85,
    label: 'Attention',
    color: '#F59E0B',
    description: "Trafic intense, aspirateur. Une exposition prolongée peut causer de la fatigue.",
  },
  {
    max: 100,
    label: 'Nocif',
    color: '#F97316',
    description: "Outils électriques, moto. Une exposition de plus de 8h peut endommager l'audition.",
  },
  {
    max: 120,
    label: 'Très Nocif',
    color: '#EF4444',
    description: "Tronçonneuse, sirène. Quelques minutes d'exposition peuvent causer des dommages.",
  },
  {
    max: 999,
    label: 'Dangereux',
    color: '#7F1D1D',
    description: "Moteur d'avion, feu d'artifice. Risque immédiat de dommages auditifs.",
  },
];

export const SOUND_LEVEL_GUIDE = [
  { color: '#16A34A', text: '0-40 dB - Silencieux : sûr pour toutes les durées.' },
  { color: '#2563EB', text: '40-70 dB - Modéré : conversation normale, bureau calme.' },
  { color: '#F59E0B', text: '70-85 dB - Attention : trafic intense, aspirateur.' },
  { color: '#F97316', text: '85-100 dB - Nocif : outils électriques, moto.' },
  { color: '#EF4444', text: '100-120 dB - Très Nocif : tronçonneuse, sirène.' },
  { color: '#7F1D1D', text: '120+ dB - Dangereux : avion, feux d\'artifice.' },
];

export function getSoundLevelCategory(level: number): SoundLevelCategory {
  return (
    SOUND_LEVEL_CATEGORIES.find((cat) => level <= cat.max) ??
    SOUND_LEVEL_CATEGORIES[SOUND_LEVEL_CATEGORIES.length - 1]
  );
}

export const LEVEL_HISTORY_SIZE = 10;

// ── Time weighting (IEC 61672) ──────────────────────────────────────────────
// Cadence of the native metering loop. 125 ms gives the exponential smoother
// below enough updates to behave at its time constant.
export const POLLING_PERIOD_MS = 125;

// "Slow" time weighting: exponential averaging with τ = 1 s (IEC 61672),
// applied to the DISPLAYED dB so the reading is steady — NOT to the raw
// per-sample dBFS.
export const TIME_WEIGHTING_TAU_S = 1.0;

// Smoothing factor derived from the cadence and τ:
//   smoothed += TIME_WEIGHTING_ALPHA * (current - smoothed)
//   alpha = 1 - exp(-(period_s) / τ)
// With 125 ms / 1 s → alpha ≈ 0.1175.
export const TIME_WEIGHTING_ALPHA =
  1 - Math.exp(-(POLLING_PERIOD_MS / 1000) / TIME_WEIGHTING_TAU_S);

// ── dBFS → dB(SPL) calibration ──────────────────────────────────────────────
// The microphone metering APIs (expo-audio `metering`, Web Audio RMS) return a
// level in dBFS — decibels relative to digital full scale: 0 ≈ clipping, and
// quieter signals are negative. We approximate an absolute dB(SPL) reading by
// adding a fixed, device-generic offset to that dBFS value.
//
// CALIBRATION RECORD
//   Date:    2026-06-12
//   Device:  iPhone 13 Pro Max
//   Ref app: NIOSH SLM (iOS)
//   Measurements (raw dBFS → NIOSH dB):
//     silence:    −45/−49 dBFS → 39–42 dB
//     voice @1 m: −28/−35 dBFS → 54–56 dB
//     loud music: −8/−17 dBFS → 71–82 dB
//   The gap (NIOSH − raw dBFS) stayed stable (~83–89) across all three levels,
//   so a single offset is valid. Measured mid-range ≈ 86; offset set to 88
//   (+2 on 2026-06-13, slightly above the calibrated mid-range for a mildly
//   conservative reading, so it reads ~0–4 dB above the NIOSH reference).
//
// PROTOCOL to re-calibrate on another device: temporarily re-expose the raw
// dBFS, measure the three conditions above side by side with a reference SLM,
// set offset = reference − raw_dBFS on the mid/loud condition, and check the gap
// stays roughly constant across levels (a drift means mic AGC, which a single
// offset can only approximate).
//
// NOTE: with offset 88 the displayed value saturates at 88 dB (raw dBFS ≤ 0),
// so MAX_DB = 120 is never reached and stays as-is. A future device needing an
// offset > 120 would require raising MAX_DB too (shared hook clamp + bar).
export const DBFS_TO_DB_OFFSET = 88;

// Upper clamp for the displayed dB, shared by the meter hook (value clamp) and
// SoundLevelBar (fill ratio) so they never diverge. If calibration pushes the
// offset higher, raise this so loud environments are not capped — the
// "Dangereux" category already covers everything above 120 dB.
export const MAX_DB = 120;

// Raw dBFS at/above which the input is essentially at digital full scale: the
// reading can no longer rise (it saturates at DBFS_TO_DB_OFFSET), so the meter
// flags the value as out-of-range ("88+") rather than presenting it as exact.
export const OVER_RANGE_DBFS = -2;

// NIOSH recommended-exposure anchor: at 85 dB(A) the safe daily limit is ~8 h,
// and the allowed time roughly halves per +3 dB above it. We surface ONLY this
// 85 dB anchor in the over-range alert — the meter saturates there and cannot
// measure the true (higher) level, so quoting a precise duration for it would
// be dishonest.
export const NIOSH_85DB_SAFE_HOURS = 8;
