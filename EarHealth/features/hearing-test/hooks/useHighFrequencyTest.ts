import { useCallback, useEffect, useRef, useState } from 'react';
import type { AudioEngineHandle } from '../audio/AudioEngine';
import { saveHearingResultResilient } from '../services/HearingResultService';
import {
  HFRT_MAX_FREQ,
  HFRT_NO_RESPONSE_MS,
  HFRT_PROMPT_AFTER_MS,
  HFRT_RELEASE_CONFIRM_MS,
  HFRT_START_FREQ,
  HFRT_SWEEP_DURATION_MS,
  HFRT_TICK_MS,
  HFRT_VOLUME,
  buildNoResponseResult,
  buildSweepResult,
  computeAge,
  freqAtElapsed,
  hfrtScoreForAge,
  interpretForAge,
  interpretMaxFrequency,
  makeInitialRuntimeState,
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
  const [stage, setStage]               = useState<HFRTStage>('intro');
  const [currentFreq, setCurrentFreq]   = useState(HFRT_START_FREQ);
  const [isHeld, setIsHeld]             = useState(false);
  // "Hold while you hear it" hint shown if the user hasn't pressed yet.
  const [inactiveWarn, setInactiveWarn] = useState(false);
  const [result, setResult]             = useState<HFRTResult | null>(null);
  const [saveStatus, setSaveStatus]     = useState<HearingSaveStatus>('idle');

  const stateRef = useRef<HFRTRuntimeState>(makeInitialRuntimeState());
  const heldRef  = useRef(false);
  const tickRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastLogRef = useRef(0); // DEBUG: last frequency logged to the terminal

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

  const finish = useCallback((res: HFRTResult) => {
    stopTicking();
    setResult(res);
    setInactiveWarn(false);
    setStage('result');
  }, [stopTicking]);

  // ── One sweep tick ──
  // The frequency is a pure function of wall-clock time since the test started,
  // so it ALWAYS glides 8 → 20 kHz on its own — independent of the hold button
  // and of audio readiness. The button only marks where the tone became
  // inaudible (the user's max audible frequency).
  const tick = useCallback(() => {
    const st = stateRef.current;
    if (st.startedAt === 0) return;

    const now  = Date.now();
    const held = heldRef.current;

    const elapsed  = now - st.startedAt;
    const freq     = freqAtElapsed(elapsed);
    const everHeld = st.everHeld || held;
    const maxWhileHeld     = held ? Math.max(st.maxFreqWhileHeld, freq) : st.maxFreqWhileHeld;
    const releaseStartedAt = held ? 0 : (everHeld ? (st.releaseStartedAt || now) : 0);

    stateRef.current = {
      ...st,
      currentFreq:      freq,
      everHeld,
      maxFreqWhileHeld: maxWhileHeld,
      releaseStartedAt,
      sweepStartedAt:   st.sweepStartedAt || (everHeld ? now : 0),
    };
    const rounded = Math.round(freq);
    setCurrentFreq(rounded);
    audio.current?.setFrequency(freq);
    setInactiveWarn(!everHeld && elapsed > HFRT_PROMPT_AFTER_MS);

    // DEBUG: log the frequency currently played, throttled to ~every 100 Hz step
    // so the Metro/Expo terminal isn't flooded (the tick runs every 50 ms).
    if (Math.abs(rounded - lastLogRef.current) >= 100) {
      lastLogRef.current = rounded;
      ///console.log(`[HFRT] Fréquence jouée : ${rounded} Hz${held ? ' (entendu)' : ''}`);
    }

    // End — the sweep reached the top of the range.
    if (elapsed >= HFRT_SWEEP_DURATION_MS || freq >= HFRT_MAX_FREQ - 1) {
      finish(everHeld ? buildSweepResult(maxWhileHeld, /* hitCeiling */ held, elapsed)
                      : buildNoResponseResult());
      return;
    }
    // End — never perceived even the 8 kHz start tone within the grace.
    if (!everHeld && elapsed > HFRT_NO_RESPONSE_MS) {
      finish(buildNoResponseResult());
      return;
    }
    // End — sustained release after hearing → this is the audible limit.
    if (everHeld && !held && releaseStartedAt > 0 && now - releaseStartedAt >= HFRT_RELEASE_CONFIRM_MS) {
      finish(buildSweepResult(maxWhileHeld, /* hitCeiling */ false, elapsed));
    }
  }, [audio, finish]);

  // ── Start the visual sweep the moment we enter the testing stage ──
  // Deliberately NOT gated on audioReady so the frequency always moves; the tone
  // (started below) simply tracks it once the audio bridge is up.
  useEffect(() => {
    if (stage !== 'testing') return;
    stateRef.current = { ...makeInitialRuntimeState(), startedAt: Date.now() };
    setCurrentFreq(HFRT_START_FREQ);
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(tick, HFRT_TICK_MS);
    return stopTicking;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // ── Start the tone once the audio bridge is ready; it tracks the sweep. ──
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
  // Durability first via the AsyncStorage queue, then idempotent upsert. A
  // "no response" outcome is NOT persisted (setup problem, not a measurement).
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
      // Stable ABSOLUTE label, independent of age → single stored vocabulary.
      interpretation:   interpretMaxFrequency(maxHz).label,
      reliable:         result.reliable,
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
