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

// NIOSH/WHO risk threshold: sustained exposure at or above 85 dB(A) can damage
// hearing over time. Surfaced explicitly in the guide and used to trigger the
// over-threshold alert (visual + haptic).
export const RISK_THRESHOLD_DB = 85;
