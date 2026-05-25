import { useCallback, useEffect, useRef, useState } from 'react';
import type { AudioEngineHandle } from '../audio/AudioEngine';
import {
  HFRT_START_FREQ,
  HFRT_TICK_MS,
  HFRT_TONE_GUARD_MS,
  HFRT_VOLUME,
  adjustFrequency,
  buildResult,
  hasConverged,
  makeInitialRuntimeState,
  recordTransition,
} from '../services/HFRTAlgorithm';
import type { HFRTResult, HFRTRuntimeState, HFRTStage } from '../types/hfrt.types';

interface UseHighFrequencyTestArgs {
  audio: React.RefObject<AudioEngineHandle | null>;
  audioReady: boolean;
}

export function useHighFrequencyTest({ audio, audioReady }: UseHighFrequencyTestArgs) {
  const [stage, setStage]               = useState<HFRTStage>('intro');
  const [currentFreq, setCurrentFreq]   = useState(HFRT_START_FREQ);
  const [isHeld, setIsHeld]             = useState(false);
  const [result, setResult]             = useState<HFRTResult | null>(null);

  const stateRef     = useRef<HFRTRuntimeState>(makeInitialRuntimeState());
  const heldRef      = useRef(false);
  const tickRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const toneStartRef = useRef(0);

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
  }, []);

  const cancel = useCallback(() => {
    stopTicking();
    setStage('intro');
    setResult(null);
    stateRef.current = makeInitialRuntimeState();
    setCurrentFreq(HFRT_START_FREQ);
    setIsHeld(false);
    heldRef.current = false;
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

  return {
    stage,
    currentFreq,
    isHeld,
    result,
    start,
    cancel,
    reset,
    onHoldStart,
    onHoldEnd,
  };
}
