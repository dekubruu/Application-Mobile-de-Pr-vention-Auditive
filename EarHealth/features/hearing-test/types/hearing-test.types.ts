export type Ear          = 'left' | 'right';
export type TestMode     = 'headset' | 'speaker';
export type HeadsetPhase = 'left-ear' | 'right-ear';

export type TestStage =
  | 'intro'               // entry: what the test is, duration, requirements
  | 'environment-check'   // 5s ambient noise measurement
  | 'headphone-detect'    // auto-detect headphones + mode choice
  | 'channel-validation'  // stereo L/R check (headset mode only)
  | 'headset-select'      // model selection (headset mode only)
  | 'pre-test'            // per-ear ready screen
  | 'testing'
  | 'ear-transition'
  | 'results';

export type AmbientStatus = 'idle' | 'measuring' | 'ok' | 'warning' | 'loud';

export type ResponseSide    = 'heard' | 'none';
export type HearingCategory = 'normal' | 'mild' | 'moderate' | 'severe';

export interface FrequencyThreshold {
  frequency:     number;
  dbLevel:       number;
  presentations: number;
  reliable:      boolean;
}

export interface HWFreqState {
  currentDb:     number;
  lastDirection: 'up' | 'down' | null;
  reversals:     number[];
  presentations: number;
}

export interface TestResult {
  frequency:     number;
  dbLevel:       number;
  heard:         boolean;
  ear:           Ear | 'both';
  isSilentTrial: boolean;
  timestamp:     number;
}

export interface HearingTestSavePayload {
  testMode:            TestMode;
  headsetId:           string | null;
  leftEarData:         FrequencyThreshold[];
  rightEarData:        FrequencyThreshold[];
  monoData:            FrequencyThreshold[];
  leftAvgDb:           number | null;
  rightAvgDb:          number | null;
  monoAvgDb:           number | null;
  leftScore:           number | null;
  rightScore:          number | null;
  monoScore:           number | null;
  falsePosRatio:       number;
  reliable:            boolean;
  ambientDb:           number | null;
  platform:            string;
  startedAt:           Date;
  completedAt:         Date;
  testDurationSeconds: number;
  environmentWarning:  boolean;
}

export interface WebAudioEngine {
  audioContext?: any;
  oscillator?:   any;
  gainNode?:     any;
  panner?:       any;
}
