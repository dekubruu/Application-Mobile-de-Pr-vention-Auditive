import {
  HW_DOWN_STEP,
  HW_MAX_DB,
  HW_MAX_PRESENTATIONS,
  HW_MIN_DB,
  HW_REVERSAL_COUNT,
  HW_START_DB,
  HW_UP_STEP,
} from '../constants/hearing-test.constants';
import type { FrequencyThreshold, HWFreqState } from '../types/hearing-test.types';

export function makeInitialHWState(): HWFreqState {
  return {
    currentDb:     HW_START_DB,
    lastDirection: null,
    reversals:     [],
    presentations: 0,
  };
}

function meanLast3(arr: number[]): number {
  const last = arr.slice(-Math.min(3, arr.length));
  return last.reduce((a, b) => a + b, 0) / last.length;
}

export interface HWStepResult {
  nextState: HWFreqState;
  done:      boolean;
  threshold: number | null; // null while in progress
}

export function hwStep(state: HWFreqState, heard: boolean): HWStepResult {
  const newDir      = heard ? 'down' : 'up';
  const isReversal  = state.lastDirection !== null && state.lastDirection !== newDir;
  const reversals   = isReversal ? [...state.reversals, state.currentDb] : [...state.reversals];
  const newDb       = heard
    ? Math.max(HW_MIN_DB, state.currentDb - HW_DOWN_STEP)
    : Math.min(HW_MAX_DB, state.currentDb + HW_UP_STEP);
  const presentations = state.presentations + 1;

  const done =
    reversals.length >= HW_REVERSAL_COUNT ||
    presentations    >= HW_MAX_PRESENTATIONS;

  const threshold = done
    ? Math.round(reversals.length >= 2 ? meanLast3(reversals) : newDb)
    : null;

  return {
    nextState: { currentDb: newDb, lastDirection: newDir, reversals, presentations },
    done,
    threshold,
  };
}

export function buildFrequencyThreshold(
  frequency: number,
  threshold: number,
  state:     HWFreqState,
): FrequencyThreshold {
  return {
    frequency,
    dbLevel:       threshold,
    presentations: state.presentations,
    reliable:      state.reversals.length >= 2,
  };
}
