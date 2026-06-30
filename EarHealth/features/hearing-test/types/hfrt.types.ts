export type HFRTStage = 'intro' | 'testing' | 'result';

export interface HFRTResult {
  maxAudibleFrequency: number;
  reliable: boolean;
  durationMs: number;
  /** Held to the 20 kHz ceiling — the true limit may be higher. */
  hitCeiling: boolean;
  /** Never perceived even the 8 kHz start tone — invalid (likely a setup issue). */
  noResponse: boolean;
}

export interface HFRTRuntimeState {
  /** Test start (tone playing, waiting for the first hold). */
  startedAt: number;
  /** When the user first held → the sweep begins (0 until then). */
  sweepStartedAt: number;
  currentFreq: number;
  /** Highest frequency reached while the button was held. */
  maxFreqWhileHeld: number;
  /** True once the user has held at least once (perceived the start tone). */
  everHeld: boolean;
  /** Start of the current post-hold release (0 while held or not yet started). */
  releaseStartedAt: number;
}
