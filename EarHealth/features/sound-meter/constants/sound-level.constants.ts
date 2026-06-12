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
// applied to the DISPLAYED dB so the reading is steady — NOT to the raw dBFS
// shown by the __DEV__ diagnostic.
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
// CALIBRATION PROTOCOL (run on the TARGET device, with the __DEV__ diagnostic
// card visible, next to a reference SLM app — NIOSH SLM or Decibel X):
//   1. Measure three conditions side by side and note (raw dBFS → reference dB):
//        a. silence (quiet room)
//        b. voice at ~1 m
//        c. loud music / loud environment
//   2. offset = reference_value − raw_dBFS, read on the MID-to-LOUD condition
//      (c, or b if c clips the reference).
//   3. Sanity check: the gap (reference − raw_dBFS) should stay roughly CONSTANT
//      across the three levels. A drifting gap means the mic is non-linear
//      (AGC) — a single offset can then only approximate it.
//
// NOTE: if the calibrated offset ends up more than ~40 above the current value
// (i.e. would push readings past 120), also raise MAX_DB to 130/140. MAX_DB is
// shared by the hook clamp and SoundLevelBar, so it is a single edit.
export const DBFS_TO_DB_OFFSET = 80;

// Upper clamp for the displayed dB, shared by the meter hook (value clamp) and
// SoundLevelBar (fill ratio) so they never diverge. If calibration pushes the
// offset higher, raise this so loud environments are not capped — the
// "Dangereux" category already covers everything above 120 dB.
export const MAX_DB = 120;
