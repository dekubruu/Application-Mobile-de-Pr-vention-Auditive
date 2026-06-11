import { useCallback, useEffect, useRef, useState } from 'react';
import type { AudioEngineHandle } from '../audio/AudioEngine';
import { saveHearingResultResilient } from '../services/HearingResultService';
import {
  HFRT_MAX_FREQ,
  HFRT_START_FREQ,
  HFRT_TICK_MS,
  HFRT_TONE_GUARD_MS,
  HFRT_VOLUME,
  adjustFrequency,
  buildResult,
  hasConverged,
  interpretMaxFrequency,
  makeInitialRuntimeState,
  recordTransition,
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
}

// HFRT score: linear ratio of max audible frequency over the upper bound.
// 20 kHz → 100, 16 kHz → 80, 12 kHz → 60. Conscious limitation: linear is a
// rough proxy and over-penalizes adult ears; revisit with an age-aware curve
// if more nuance is needed later.
function hfrtScore(maxFrequencyHz: number): number {
  return Math.round(
    Math.min(100, Math.max(0, (maxFrequencyHz / HFRT_MAX_FREQ) * 100)),
  );
}

export function useHighFrequencyTest({
  audio, audioReady, userId, onSaved,
}: UseHighFrequencyTestArgs) {
  const [stage, setStage]               = useState<HFRTStage>('intro');
  const [currentFreq, setCurrentFreq]   = useState(HFRT_START_FREQ);
  const [isHeld, setIsHeld]             = useState(false);
  const [result, setResult]             = useState<HFRTResult | null>(null);
  const [saveStatus, setSaveStatus]     = useState<HearingSaveStatus>('idle');

  const stateRef     = useRef<HFRTRuntimeState>(makeInitialRuntimeState());
  const heldRef      = useRef(false);
  const tickRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const toneStartRef = useRef(0);

  // ── Save refs (mirror of useQuiz pattern) ──
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

  const tick = useCallback(() => {
    const st  = stateRef.current;
    const now = Date.now();
    if (now - toneStartRef.current < HFRT_TONE_GUARD_MS) return;

    const held = heldRef.current;

    const newTrans: 'hold' | 'release' = held ? 'hold' : 'release';
    const { reversals } = recordTransition(
      st.reversals, st.lastTransition, newTrans, st.currentFreq, now,
    );

    const nextFreq = adjustFrequency(st.currentFreq, held);

    const nextState: HFRTRuntimeState = {
      ...st,
      currentFreq:    nextFreq,
      reversals,
      lastTransition: newTrans,
    };
    stateRef.current = nextState;
    setCurrentFreq(Math.round(nextFreq));
    audio.current?.setFrequency(nextFreq);

    if (hasConverged(nextState, now)) {
      stopTicking();
      const final = buildResult(nextState, now);
      setResult(final);
      setStage('result');
    }
  }, [audio, stopTicking]);

  const startTone = useCallback(() => {
    if (!audioReady) return;
    toneStartRef.current = Date.now();
    stateRef.current = { ...stateRef.current, startedAt: toneStartRef.current };
    audio.current?.playTone(stateRef.current.currentFreq, HFRT_VOLUME, 'both');
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(tick, HFRT_TICK_MS);
  }, [audio, audioReady, tick]);

  const start = useCallback(() => {
    stateRef.current = makeInitialRuntimeState();
    setCurrentFreq(HFRT_START_FREQ);
    setResult(null);
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
    setIsHeld(false);
    heldRef.current = false;
    savedRef.current = false;
    setSaveStatus('idle');
  }, [stopTicking]);

  const reset = cancel;

  const onHoldStart = useCallback(() => {
    heldRef.current = true;
    setIsHeld(true);
  }, []);

  const onHoldEnd = useCallback(() => {
    heldRef.current = false;
    setIsHeld(false);
  }, []);

  useEffect(() => {
    if (stage !== 'testing') return;
    if (!audioReady) return;
    startTone();
    return stopTicking;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, audioReady]);

  useEffect(() => {
    return () => { stopTicking(); };
  }, [stopTicking]);

  // ── Auto-save when result is available ──
  // Mirrors the useQuiz / usePureToneTest pattern: durability first via
  // AsyncStorage queue, then idempotent upsert. The same id is reused on any
  // retry; ON CONFLICT DO NOTHING makes replays a server-side no-op.
  useEffect(() => {
    if (stage !== 'result') return;
    if (!result)            return;
    if (savedRef.current)   return;
    if (!userId)            return;

    savedRef.current = true;
    setSaveStatus('saving');

    const maxHz = result.maxAudibleFrequency;
    const payload: HFRTPayload = {
      maxFrequencyHz: maxHz,
      interpretation: interpretMaxFrequency(maxHz).label,
    };
    const overallScore = hfrtScore(maxHz);

    saveHearingResultResilient(userId, 'hfrt', payload, overallScore)
      .then(outcome => {
        setSaveStatus(outcome.status === 'synced' ? 'saved' : 'queued');
        onSavedRef.current?.();
      })
      .catch(() => {
        savedRef.current = false;
        setSaveStatus('error');
      });
  }, [stage, result, userId]);

  return {
    stage,
    currentFreq,
    isHeld,
    result,
    saveStatus,
    start,
    cancel,
    reset,
    onHoldStart,
    onHoldEnd,
  };
}
