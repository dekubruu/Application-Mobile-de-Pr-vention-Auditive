import { useCallback, useEffect, useRef, useState } from 'react';
import type { AudioEngineHandle } from '../audio/AudioEngine';
import {
  PTT_FREQUENCIES,
  PTT_PULSE_CYCLE_MS,
  PTT_PULSE_ON_MS,
  PTT_TONE_GUARD_MS,
  adjustDb,
  averageEarDb,
  buildFrequencyResult,
  dbToVolume,
  hasConverged,
  isInactive,
  makeInitialRuntimeState,
  recordTransition,
} from '../services/PTTAlgorithm';
import type {
  PTTEar,
  PTTEarResult,
  PTTFrequencyResult,
  PTTRuntimeState,
  PTTStage,
} from '../types/ptt.types';

interface UsePureToneTestArgs {
  audio: React.RefObject<AudioEngineHandle | null>;
  audioReady: boolean;
}

export function usePureToneTest({ audio, audioReady }: UsePureToneTestArgs) {
  // ── React state (UI) ──
  const [stage, setStage]                       = useState<PTTStage>('intro');
  const [currentEar, setCurrentEar]             = useState<PTTEar>('left');
  const [freqIndex, setFreqIndex]               = useState(0);
  const [currentDb, setCurrentDb]               = useState(0);
  const [isHeld, setIsHeld]                     = useState(false);
  const [isPulsing, setIsPulsing]               = useState(false);
  const [inactiveWarn, setInactiveWarn]         = useState(false);
  const [completedFreqs, setCompletedFreqs]     = useState<PTTFrequencyResult[]>([]);
  const [earResults, setEarResults]             = useState<PTTEarResult[]>([]);

  // ── Refs (algorithm state, immune to React render timing) ──
  const stateRef       = useRef<PTTRuntimeState>(makeInitialRuntimeState());
  const heldRef        = useRef(false);
  const pulseTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const earRef         = useRef<PTTEar>('left');
  const stageRef       = useRef<PTTStage>('intro');

  // ── Cleanup all timers + audio ──
  const stopAll = useCallback(() => {
    if (pulseTimerRef.current) { clearTimeout(pulseTimerRef.current); pulseTimerRef.current = null; }
    if (offTimerRef.current)   { clearTimeout(offTimerRef.current);   offTimerRef.current   = null; }
    audio.current?.stopTone();
    setIsPulsing(false);
  }, [audio]);

  // ── Finalize one ear ──
  const finalizeEar = useCallback((ear: PTTEar, freqs: PTTFrequencyResult[]) => {
    setEarResults(prev => {
      if (prev.some(e => e.ear === ear)) return prev;
      return [
        ...prev,
        { ear, thresholds: freqs, avgDb: averageEarDb(freqs) },
      ];
    });
  }, []);

  // ── Advance: next freq / next ear / finish ──
  const advance = useCallback((completedFreqsLocal: PTTFrequencyResult[]) => {
    stopAll();

    const nextIdx = stateRef.current.freqIndex + 1;
    if (nextIdx < PTT_FREQUENCIES.length) {
      stateRef.current = { ...makeInitialRuntimeState(), freqIndex: nextIdx };
      setFreqIndex(nextIdx);
      setCurrentDb(stateRef.current.currentDb);
      setInactiveWarn(false);
      return;
    }

    finalizeEar(earRef.current, completedFreqsLocal);

    if (earRef.current === 'left') {
      setStage('between-ears');
      stageRef.current = 'between-ears';
    } else {
      setStage('result');
      stageRef.current = 'result';
    }
  }, [finalizeEar, stopAll]);

  // ── One pulse cycle: sample state, adjust dB, play 250ms on / 350ms off ──
  const pulseCycle = useCallback(() => {
    if (stageRef.current !== 'testing') return;

    const st  = stateRef.current;
    const now = Date.now();

    // Skip decision during the initial guard window of the very first pulse.
    const inGuard = (now - st.startedAt) < PTT_TONE_GUARD_MS && st.presentations === 0;
    const held    = inGuard ? false : heldRef.current;

    // Determine transition + reversal (against previous tick state)
    const newTrans: 'hold' | 'release' = held ? 'hold' : 'release';
    const { reversals, isReversal } = recordTransition(
      st.reversals, st.lastTransition, newTrans, st.currentDb, now,
    );

    const nextDb = adjustDb(st.currentDb, held, st.reversals.length);

    const nextState: PTTRuntimeState = {
      ...st,
      currentDb:      nextDb,
      reversals,
      presentations:  st.presentations + 1,
      lastTransition: newTrans,
    };
    stateRef.current = nextState;
    setCurrentDb(nextDb);

    // Inactivity warning (visual hint, no algorithm change)
    setInactiveWarn(isInactive(nextState, now));

    void isReversal; // reserved for future haptics

    // Convergence?
    if (hasConverged(nextState, now)) {
      const freq   = PTT_FREQUENCIES[st.freqIndex];
      const result = buildFrequencyResult(freq, nextState, now);
      setCompletedFreqs(prev => {
        const next = [...prev, result];
        setTimeout(() => advance(next), 0);
        return next;
      });
      return;
    }

    // Play the pulse ON
    const freq = PTT_FREQUENCIES[st.freqIndex];
    audio.current?.playTone(freq, dbToVolume(nextDb), earRef.current);
    setIsPulsing(true);

    // Stop after PULSE_ON_MS
    offTimerRef.current = setTimeout(() => {
      audio.current?.stopTone();
      setIsPulsing(false);
    }, PTT_PULSE_ON_MS);

    // Schedule next cycle
    pulseTimerRef.current = setTimeout(pulseCycle, PTT_PULSE_CYCLE_MS);
  }, [audio, advance]);

  // ── Start tone loop for current freq + ear ──
  const startCurrentTone = useCallback(() => {
    if (!audioReady) return;
    stopAll();
    if (stateRef.current.startedAt === 0) {
      stateRef.current = { ...stateRef.current, startedAt: Date.now() };
    }
    setInactiveWarn(false);
    // Kick off the first pulse immediately
    pulseCycle();
  }, [audioReady, pulseCycle, stopAll]);

  // ── Public actions ──
  const start = useCallback(() => {
    setEarResults([]);
    setCompletedFreqs([]);
    earRef.current  = 'left';
    setCurrentEar('left');
    stateRef.current = makeInitialRuntimeState();
    setFreqIndex(0);
    setCurrentDb(stateRef.current.currentDb);
    setInactiveWarn(false);
    setStage('testing');
    stageRef.current = 'testing';
  }, []);

  const startRightEar = useCallback(() => {
    setCompletedFreqs([]);
    earRef.current = 'right';
    setCurrentEar('right');
    stateRef.current = makeInitialRuntimeState();
    setFreqIndex(0);
    setCurrentDb(stateRef.current.currentDb);
    setInactiveWarn(false);
    setStage('testing');
    stageRef.current = 'testing';
  }, []);

  const cancel = useCallback(() => {
    stopAll();
    setStage('intro');
    stageRef.current = 'intro';
    setEarResults([]);
    setCompletedFreqs([]);
    earRef.current = 'left';
    setCurrentEar('left');
    stateRef.current = makeInitialRuntimeState();
    setFreqIndex(0);
    setCurrentDb(0);
    setIsHeld(false);
    heldRef.current = false;
    setInactiveWarn(false);
  }, [stopAll]);

  const reset = cancel;

  // ── Hold/release handlers ──
  const onHoldStart = useCallback(() => {
    heldRef.current = true;
    setIsHeld(true);
  }, []);

  const onHoldEnd = useCallback(() => {
    heldRef.current = false;
    setIsHeld(false);
  }, []);

  // ── Effects ──
  useEffect(() => {
    if (stage !== 'testing') return;
    if (!audioReady) return;
    startCurrentTone();
    return stopAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, freqIndex, currentEar, audioReady]);

  useEffect(() => {
    return () => { stopAll(); };
  }, [stopAll]);

  return {
    // state
    stage,
    currentEar,
    freqIndex,
    totalFreqs:       PTT_FREQUENCIES.length,
    currentFrequency: PTT_FREQUENCIES[freqIndex],
    currentDb,
    isHeld,
    isPulsing,
    inactiveWarn,
    completedFreqs,
    earResults,

    // actions
    start,
    startRightEar,
    cancel,
    reset,
    onHoldStart,
    onHoldEnd,
  };
}
