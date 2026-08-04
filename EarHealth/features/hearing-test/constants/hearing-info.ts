// ─────────────────────────────────────────────────────────────────────────────
// Educational content shown behind the "ⓘ" info tooltips. Kept as data (not
// JSX) so the same text can be reused across screens (home card, PTT result).
// Non-diagnostic — every panel ends with INFO_DISCLAIMER.
// ─────────────────────────────────────────────────────────────────────────────

export interface InfoContent {
  title:      string;
  paragraphs: string[];
  /** Optional reference scale (e.g. dB → loudness), shown as labelled rows. */
  scale?:     { range: string; label: string }[];
  /** Optional external reference opened in an in-app browser. */
  link?:      { label: string; url: string };
  /** When true, the shared educational disclaimer is NOT repeated in this panel
   *  (it lives at the bottom of the home screen instead). */
  hideDisclaimer?: boolean;
}

export const INFO_DISCLAIMER =
  'Informations fournies à titre indicatif et éducatif. Cette application réalise un ' +
  'dépistage sur matériel non calibré et ne pose aucun diagnostic médical. Pour toute ' +
  'évaluation ou décision, consultez un professionnel de santé (médecin ORL, audiologiste).';

// Loudness-equivalent labels for a displayed (0..100) dB threshold. Shared by
// SEUIL_AUDITIF_INFO's scale panel and the "Seuil auditif" result card so the
// two never drift apart.
const SEUIL_SCALE = [
  { max: 40,  range: '0–40 dB',   label: 'Chuchotement' },
  { max: 65,  range: '41–65 dB',  label: 'Conversation normale' },
  { max: 80,  range: '66–80 dB',  label: 'Voix forte' },
  { max: 100, range: '81–100 dB', label: 'Cri' },
];

export function getSeuilLabel(displayDb: number): string {
  const step = SEUIL_SCALE.find(s => displayDb <= s.max);
  return (step ?? SEUIL_SCALE[SEUIL_SCALE.length - 1]).label;
}

export const SEUIL_AUDITIF_INFO: InfoContent = {
  title: 'Le seuil auditif',
  paragraphs: [
    'Le seuil auditif, généralement compris entre 0 et 100 décibels (dB), représente la ' +
      'moyenne des résultats auditifs de 500 Hz à 4 kHz pour chaque oreille.',
    'Plus le chiffre est bas, plus vous percevez des sons faibles.',
  ],
  scale: SEUIL_SCALE.map(({ range, label }) => ({ range, label })),
  link: { label: 'HearingNumber.org', url: 'https://www.hearingnumber.org' },
  // The disclaimer is surfaced via the "Clause de non-responsabilité" button
  // on the home screen instead of being repeated in this panel.
  hideDisclaimer: true,
};

export const PERTE_AUDITIVE_INFO: InfoContent = {
  title: 'La perte auditive',
  paragraphs: [
    "La perte auditive est définie par l'oreille la plus performante.",
    "En effet, l'asymétrie de l'audition, fréquente chez de nombreux individus, conduit " +
      "souvent la meilleure oreille à compenser l'autre.",
  ],
  link: { label: 'who.int', url: 'https://www.who.int' },
};

export const CAPACITE_AUDITIVE_INFO: InfoContent = {
  title: 'La capacité auditive',
  paragraphs: [
    'Ce pourcentage traduit votre seuil auditif sur une échelle plus intuitive : ' +
      '100 % correspond au seuil le plus bas mesurable par le test (0 dB), 0 % au seuil ' +
      'le plus élevé (100 dB).',
    "Plus le pourcentage est élevé, plus votre capacité auditive est élevée.",
  ],
  hideDisclaimer: true,
};

export const HAUTES_FREQUENCES_INFO: InfoContent = {
  title: 'Les hautes fréquences',
  paragraphs: [
    'Les hautes fréquences (sons aigus), mesurées de 8 à 20 kHz, sont les sons les plus aigus ' +
      'perceptibles. Ce test estime la fréquence la plus haute que vous entendez encore.',
    "Cette limite baisse avec l'âge et le bruit, souvent avant que la parole ne devienne " +
      'difficile à suivre.',
  ],
  // Reference values aligned with the app's own age model (~17.5 kHz at 20 y/o,
  // declining ~200 Hz per year) so the panel never contradicts the age comparison.
  scale: [
    { range: '0–20 ans',    label: '≈ 17–20 kHz' },
    { range: '21–30 ans',   label: '≈ 15–17 kHz' },
    { range: '31–40 ans',   label: '≈ 13–15 kHz' },
    { range: '41–50 ans',   label: '≈ 11–13 kHz' },
    { range: '51–60 ans',   label: '≈ 9–11 kHz' },
    { range: '60 ans et +', label: '≈ 8–9 kHz' },
  ],
  link: {
    label: 'OMS · Surdité et perte auditive',
    url: 'https://www.who.int/fr/news-room/fact-sheets/detail/deafness-and-hearing-loss',
  },
  hideDisclaimer: true,
};

// Standalone panel for the home-screen "Clause de non-responsabilité" button.
export const DISCLAIMER_INFO: InfoContent = {
  title: 'Clause de non-responsabilité',
  paragraphs: [INFO_DISCLAIMER],
  hideDisclaimer: true, // it IS the disclaimer — don't repeat it below itself
};
