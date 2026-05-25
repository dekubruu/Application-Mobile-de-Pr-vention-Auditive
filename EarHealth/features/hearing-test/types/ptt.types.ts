export type PTTEar   = 'left' | 'right';
export type PTTStage = 'intro' | 'testing' | 'between-ears' | 'result';

export interface PTTFrequencyResult {
  frequency: number;
  thresholdDb: number;
  reversals: number;
  presentations: number;
  reliable: boolean;
}

export interface PTTEarResult {
  ear: PTTEar;
  thresholds: PTTFrequencyResult[];
  avgDb: number;
}

export interface PTTReversalPoint {
  db: number;
  direction: 'hold-to-release' | 'release-to-hold';
  atMs: number;
}

export interface PTTRuntimeState {
  freqIndex: number;
  currentDb: number;
  reversals: PTTReversalPoint[];
  presentations: number;
  lastTransition: 'hold' | 'release' | null;
  startedAt: number;
}
