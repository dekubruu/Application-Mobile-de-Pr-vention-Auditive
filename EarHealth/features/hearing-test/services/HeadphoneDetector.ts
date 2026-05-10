// Best-effort headphone detection.
// Tier 1: enumerateDevices() label matching (Android + web; iOS gives empty labels).
// Tier 2 (future): native AVAudioSession route — implement in a custom Expo module.
// Falls back gracefully to 'unknown' when no detection is possible.

export type HeadphoneType = 'airpods' | 'bluetooth' | 'wired' | 'speaker' | 'unknown';

export interface HeadphoneDetectionResult {
  connected: boolean;
  type:      HeadphoneType;
  label:     string | null;
  headsetId: string | null; // matches HEADSETS list id in HeadsetSelectView
}

const LABEL_MAP: Array<{ pattern: string; id: string; type: HeadphoneType }> = [
  { pattern: 'airpods pro',          id: 'airpods_pro2',     type: 'airpods'    },
  { pattern: 'airpods max',          id: 'airpods_max',      type: 'airpods'    },
  { pattern: 'airpods',              id: 'airpods3',         type: 'airpods'    },
  { pattern: 'wh-1000xm5',          id: 'sony_wh1000xm5',   type: 'bluetooth'  },
  { pattern: 'wf-1000xm5',          id: 'sony_wf1000xm5',   type: 'bluetooth'  },
  { pattern: 'quietcomfort 45',      id: 'bose_qc45',        type: 'bluetooth'  },
  { pattern: 'qc45',                 id: 'bose_qc45',        type: 'bluetooth'  },
  { pattern: 'quietcomfort earbuds', id: 'bose_qe2',         type: 'bluetooth'  },
  { pattern: 'galaxy buds',          id: 'samsung_buds2',    type: 'bluetooth'  },
  { pattern: 'evolve2 85',           id: 'jabra_85h',        type: 'bluetooth'  },
  { pattern: 'evolve 85',            id: 'jabra_85h',        type: 'bluetooth'  },
  { pattern: 'headphone',            id: null,               type: 'wired'      },
  { pattern: 'earphone',             id: null,               type: 'wired'      },
  { pattern: 'headset',              id: null,               type: 'bluetooth'  },
];

export function detectFromLabels(labels: string[]): HeadphoneDetectionResult {
  const text = labels.join(' ').toLowerCase();

  for (const entry of LABEL_MAP) {
    if (text.includes(entry.pattern)) {
      return {
        connected: true,
        type:      entry.type,
        label:     labels.find(l => l.includes(entry.pattern)) ?? null,
        headsetId: entry.id,
      };
    }
  }

  // Labels present but no known pattern → generic headphones
  if (labels.length > 0) {
    return { connected: true, type: 'bluetooth', label: labels[0], headsetId: null };
  }

  return { connected: false, type: 'unknown', label: null, headsetId: null };
}
