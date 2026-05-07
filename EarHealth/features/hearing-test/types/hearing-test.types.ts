export interface TestResult {
  frequency: number;
  heard: boolean;
  timestamp: number;
}

export type TestPhase = 'ascending' | 'binary-search';

export interface TestSummary {
  status: string;
  interpretation: string;
}

export interface WebAudioEngine {
  audioContext?: any;
  oscillator?: any;
  gainNode?: any;
}
