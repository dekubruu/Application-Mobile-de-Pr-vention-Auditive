export type HFRTStage = 'intro' | 'testing' | 'result';

export interface HFRTResult {
  maxAudibleFrequency: number;
  reliable: boolean;
  durationMs: number;
  /** Held to the 20 kHz ceiling — the true limit may be higher. */
  hitCeiling: boolean;
  /** Never perceived the 8 kHz tone — invalid (likely a setup issue). */
  noResponse: boolean;
  /** Number of hold↔release reversals used (the PTT "basculements"). */
  reversals: number;
}

export interface HFRTRuntimeState {
  /** Test start (tone playing). */
  startedAt: number;
  /** Frequency currently played. Rises while held, falls while released. */
  currentFreq: number;
  /** Frequencies (Hz) at each reversal (hold↔release direction change). */
  reversals: number[];
  /** Last hold/release state, to detect reversals. */
  lastTransition: 'hold' | 'release' | null;
  /** Timestamp of the last reversal, for stall detection. */
  lastReversalAt: number;
  /** True once the user has held at least once (perceived a tone). */
  everHeld: boolean;
  /** True once the tone was first lost going up (hold→release) → switch to fine steps. */
  everLostTone: boolean;
  /** Highest frequency reached while held (fallback estimate). */
  maxFreqWhileHeld: number;
}
