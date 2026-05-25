export type HFRTStage = 'intro' | 'testing' | 'result';

export interface HFRTReversalPoint {
  frequency: number;
  direction: 'hold-to-release' | 'release-to-hold';
  atMs: number;
}

export interface HFRTResult {
  maxAudibleFrequency: number;
  reversals: HFRTReversalPoint[];
  reliable: boolean;
  durationMs: number;
}

export interface HFRTRuntimeState {
  currentFreq: number;
  reversals: HFRTReversalPoint[];
  lastTransition: 'hold' | 'release' | null;
  startedAt: number;
}
