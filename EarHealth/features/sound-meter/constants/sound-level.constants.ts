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

// ── dBFS → dB(SPL) calibration ──────────────────────────────────────────────
// The microphone metering APIs (expo-audio `metering`, Web Audio RMS) return a
// level in dBFS — decibels relative to digital full scale: 0 ≈ clipping, and
// quieter signals are negative. We approximate an absolute dB(SPL) reading by
// adding a fixed offset to that dBFS value.
//
// HOW TO CALIBRATE: on the TARGET device, play/keep a steady sound source and
// compare the displayed dB against a reference sound-level meter (e.g. the
// NIOSH SLM app on iOS). Adjust this offset until they match. The correct value
// is device- and microphone-dependent, so it can only be set empirically.
//
// Symptom of a too-low offset: the displayed dB plateaus well below reality in
// loud environments. Use the __DEV__ diagnostic readout (raw dBFS) to tell the
// two failure modes apart — see useSoundMeter.
export const DBFS_TO_DB_OFFSET = 80;

// Upper clamp for the displayed dB, shared by the meter hook (value clamp) and
// SoundLevelBar (fill ratio) so they never diverge. If calibration pushes the
// offset higher, raise this so loud environments are not capped — the
// "Dangereux" category already covers everything above 120 dB.
export const MAX_DB = 120;
