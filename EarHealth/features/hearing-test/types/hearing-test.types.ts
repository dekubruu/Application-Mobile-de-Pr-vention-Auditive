// Shared hearing-test domain types.
//
// After the HW legacy removal, this file keeps the types that are still
// consumed by the PTT/HFRT runtime and the dashboard:
//   • FrequencyThreshold — produced by PTT (per-frequency) and used by the
//     HearingResultService helpers (averageDb, detectHFLoss).
//   • HearingCategory    — used by the dashboard mapper and category helpers.
//
// Test-specific shapes live next to their algorithm: ptt.types.ts, hfrt.types.ts.

export type HearingCategory = 'normal' | 'mild' | 'moderate' | 'severe';

export interface FrequencyThreshold {
  frequency:     number;
  dbLevel:       number;
  presentations: number;
  reliable:      boolean;
}
