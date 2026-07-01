import { useCallback, useEffect, useRef, useState } from 'react';
import type { AudioEngineHandle } from '../audio/AudioEngine';
import { saveHearingResultResilient } from '../services/HearingResultService';
import {
  HFRT_INACTIVITY_MS,
  HFRT_MAX_DURATION_MS,
  HFRT_MAX_FREQ,
  HFRT_REVERSALS_TARGET,
  HFRT_STALL_MS,
  HFRT_START_FREQ,
  HFRT_STEP_MS,
  HFRT_VOLUME,
  adjustStaircaseFrequency,
  buildCeilingResult,
  buildNoResponseResult,
  buildRefinedResult,
  computeAge,
  hfrtScoreForAge,
  interpretForAge,
  interpretMaxFrequency,
  makeInitialRuntimeState,
  recordReversal,
} from '../services/HFRTAlgorithm';
import type { HearingSaveStatus, HFRTPayload } from '../services/hearing.storage';
import type { HFRTResult, HFRTRuntimeState, HFRTStage } from '../types/hfrt.types';

interface UseHighFrequencyTestArgs {
  audio:      React.RefObject<AudioEngineHandle | null>;
  audioReady: boolean;
  /** User id for persistence. If null/undefined, results are NOT saved. */
  userId?:    string | null;
  /** Optional callback fired after a save attempt (synced OR queued). */
  onSaved?:   () => void;
  /** Profile birth date (ISO). Enables the age-relative interpretation/score. */
  dateOfBirth?: string | null;
}

export function useHighFrequencyTest({
  audio, audioReady, userId, onSaved, dateOfBirth,
}: UseHighFrequencyTestArgs) {
  const [stage, setStage]                 = useState<HFRTStage>('intro');
  const [currentFreq, setCurrentFreq]     = useState(HFRT_START_FREQ);
  const [reversalCount, setReversalCount] = useState(0);
  const [isHeld, setIsHeld]               = useState(false);
  const [inactiveWarn, setInactiveWarn]   = useState(false);
  const [result, setResult]               = useState<HFRTResult | null>(null);
  const [saveStatus, setSaveStatus]       = useState<HearingSaveStatus>('idle');

  const stateRef = useRef<HFRTRuntimeState>(makeInitialRuntimeState());
  const heldRef  = useRef(false);
  const tickRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const savedRef   = useRef(false);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const stopTicking = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    audio.current?.stopTone();
  }, [audio]);

  const finish = useCallback((res: HFRTResult) => {
    stopTicking();
    setResult(res);
    setInactiveWarn(false);
    setStage('result');
  }, [stopTicking]);

  // ── One staircase step ──
  // Hold → climb toward 20 kHz; release → descend toward 8 kHz. Coarse steps
  // until the tone is first lost going up (first hold→release reversal), then
  // fine steps. The audible limit is the geometric mean of the reversals.
  const tick = useCallback(() => {
    const st = stateRef.current;
    if (st.startedAt === 0) return;

    const now  = Date.now();
    const held = heldRef.current;

    const newTrans: 'hold' | 'release' = held ? 'hold' : 'release';
    const { reversals, isReversal } = recordReversal(st.reversals, st.lastTransition, newTrans, st.currentFreq);
    const everHeld       = st.everHeld || held;
    const everLostTone   = st.everLostTone || (isReversal && newTrans === 'release');
    const lastReversalAt = isReversal ? now : st.lastReversalAt;

    // Step uses the phase BEFORE this reversal (like the PTT): the switch to fine
    // takes effect on the next step.
    const nextFreq = adjustStaircaseFrequency(st.currentFreq, held, st.everLostTone);
    const maxWhileHeld = held ? Math.max(st.maxFreqWhileHeld, nextFreq) : st.maxFreqWhileHeld;

    stateRef.current = {
      ...st,
      currentFreq:      nextFreq,
      reversals,
      lastTransition:   newTrans,
      everHeld,
      everLostTone,
      lastReversalAt,
      maxFreqWhileHeld: maxWhileHeld,
    };
    setCurrentFreq(Math.round(nextFreq));
    audio.current?.setFrequency(nextFreq);
    setReversalCount(reversals.length);

    const sinceReversal = now - lastReversalAt;
    setInactiveWarn(sinceReversal > HFRT_INACTIVITY_MS);

    // Ceiling: climbed straight to the top and still hearing (no tracking band).
    if (held && nextFreq >= HFRT_MAX_FREQ - 1 && reversals.length < 2) {
      finish(buildCeilingResult(now - st.startedAt));
      return;
    }
    // Converged on enough reversals → precise geometric-mean average.
    if (reversals.length >= HFRT_REVERSALS_TARGET) {
      finish(buildRefinedResult(reversals, maxWhileHeld, now - st.startedAt));
      return;
    }
    // Stalled (no reversal for a while): finish with the best estimate, or
    // "no response" if the user never perceived anything.
    if (sinceReversal > HFRT_STALL_MS) {
      finish(everHeld ? buildRefinedResult(reversals, maxWhileHeld, now - st.startedAt)
                      : buildNoResponseResult());
      return;
    }
    // Absolute safety backstop.
    if (now - st.startedAt > HFRT_MAX_DURATION_MS) {
      finish(everHeld ? buildRefinedResult(reversals, maxWhileHeld, now - st.startedAt)
                      : buildNoResponseResult());
    }
  }, [audio, finish]);

  // ── Start the staircase on entering the testing stage (independent of
  //    audioReady so the frequency always moves; the tone tracks it below). ──
  useEffect(() => {
    if (stage !== 'testing') return;
    const now = Date.now();
    stateRef.current = { ...makeInitialRuntimeState(), startedAt: now, lastReversalAt: now };
    setCurrentFreq(HFRT_START_FREQ);
    setReversalCount(0);
    setInactiveWarn(false);
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(tick, HFRT_STEP_MS);
    return stopTicking;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // ── Start the tone once the audio bridge is ready; it tracks the staircase. ──
  useEffect(() => {
    if (stage !== 'testing') return;
    if (!audioReady) return;
    const f = Math.round(stateRef.current.currentFreq) || HFRT_START_FREQ;
    audio.current?.playTone(f, HFRT_VOLUME, 'both');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, audioReady]);

  const start = useCallback(() => {
    stateRef.current = makeInitialRuntimeState();
    setCurrentFreq(HFRT_START_FREQ);
    setReversalCount(0);
    setResult(null);
    setInactiveWarn(false);
    setStage('testing');
    savedRef.current = false;
    setSaveStatus('idle');
  }, []);

  const cancel = useCallback(() => {
    stopTicking();
    setStage('intro');
    setResult(null);
    stateRef.current = makeInitialRuntimeState();
    setCurrentFreq(HFRT_START_FREQ);
    setReversalCount(0);
    setIsHeld(false);
    heldRef.current = false;
    setInactiveWarn(false);
    savedRef.current = false;
    setSaveStatus('idle');
  }, [stopTicking]);

  const reset = cancel;

  const onHoldStart = useCallback(() => { heldRef.current = true;  setIsHeld(true); }, []);
  const onHoldEnd   = useCallback(() => { heldRef.current = false; setIsHeld(false); }, []);

  useEffect(() => {
    return () => { stopTicking(); };
  }, [stopTicking]);

  // ── Auto-save when a valid result is available ──
  useEffect(() => {
    if (stage !== 'result') return;
    if (!result)            return;
    if (savedRef.current)   return;
    if (!userId)            return;
    if (result.noResponse)  return;

    savedRef.current = true;
    setSaveStatus('saving');

    const age    = computeAge(dateOfBirth);
    const maxHz  = result.maxAudibleFrequency;
    const interp = interpretForAge(maxHz, age);

    const payload: HFRTPayload = {
      maxFrequencyHz:   maxHz,
      interpretation:   interpretMaxFrequency(maxHz).label,
      reliable:         result.reliable,
      reversals:        result.reversals,
      durationMs:       result.durationMs,
      hitCeiling:       result.hitCeiling,
      noResponse:       result.noResponse,
      ageAtTest:        age ?? undefined,
      expectedForAgeHz: interp.expectedHz ?? undefined,
      relativeToAge:    interp.relative ? interp.label : undefined,
      relative:         interp.relative ?? undefined,
    };
    const overallScore = hfrtScoreForAge(maxHz, age);

    saveHearingResultResilient(userId, 'hfrt', payload, overallScore)
      .then(outcome => {
        setSaveStatus(outcome.status === 'synced' ? 'saved' : 'queued');
        onSavedRef.current?.();
      })
      .catch(() => {
        savedRef.current = false;
        setSaveStatus('error');
      });
  }, [stage, result, userId, dateOfBirth]);

  return {
    stage,
    currentFreq,
    reversalCount,
    isHeld,
    inactiveWarn,
    result,
    saveStatus,
    start,
    cancel,
    reset,
    onHoldStart,
    onHoldEnd,
  };
}
