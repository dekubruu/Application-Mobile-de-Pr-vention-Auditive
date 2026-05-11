import { useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import {
  CV_FREQUENCY,
  CV_MAX_ATTEMPTS,
  CV_VOLUME,
  ISI_MAX_MS,
  ISI_MIN_MS,
  MIN_RESPONSE_INTERVAL_MS,
  SILENT_TRIAL_PROBABILITY,
  TONE_START_GUARD_MS,
  TEST_FREQUENCIES,
  dbToVolume,
  getHearingCategory,
} from '../constants/hearing-test.constants';
import { detectFromLabels } from '../services/HeadphoneDetector';
import {
  buildFrequencyThreshold,
  hwStep,
  makeInitialHWState,
} from '../services/HWAlgorithm';
import {
  averageDb,
  calculateHearingScore,
  saveHearingTestResult,
} from '../services/HearingResultService';
import { useAmbientCheck } from './useAmbientCheck';
import type {
  Ear,
  FrequencyThreshold,
  HWFreqState,
  HearingCategory,
  HearingTestSavePayload,
  TestMode,
  TestStage,
  WebAudioEngine,
} from '../types/hearing-test.types';
import type { HeadphoneDetectionResult } from '../services/HeadphoneDetector';

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomISI(): number {
  return ISI_MIN_MS + Math.random() * (ISI_MAX_MS - ISI_MIN_MS);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useHearingTest = (userId?: string) => {
  const webViewRef          = useRef<WebView>(null);
  const webAudioEngineRef   = useRef<WebAudioEngine | null>(null);
  const autoPlayTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastResponseTimeRef = useRef(0);
  const toneStartTimeRef    = useRef(0);
  const isWeb               = Platform.OS === 'web';

  // ── Refs for algorithm state (immune to React Compiler stale closures) ────
  const hwStateRef          = useRef<HWFreqState>(makeInitialHWState());
  const freqIndexRef        = useRef(0);
  const frequencyResultsRef = useRef<FrequencyThreshold[]>([]);
  const isSilentTrialRef    = useRef(false);
  const currentEarRef       = useRef<Ear>('left');
  const testModeRef         = useRef<TestMode>('headset');
  const cvTargetEarRef      = useRef<Ear>('left');

  // ── Refs for auto-save (safe to read in async callbacks) ─────────────────
  const testStartedAtRef     = useRef<Date | null>(null);
  const falsePositivesRef    = useRef(0);
  const silentCountRef       = useRef(0);
  const leftEarResultsRef    = useRef<FrequencyThreshold[]>([]);
  const rightEarResultsRef   = useRef<FrequencyThreshold[]>([]);
  const monoResultsRef       = useRef<FrequencyThreshold[]>([]);
  const selectedHeadsetIdRef = useRef<string | null>(null);
  const ambientDbRef         = useRef<number | null>(null);

  // ── Ambient noise ─────────────────────────────────────────────────────────
  const ambient = useAmbientCheck();

  // ── Flow ──────────────────────────────────────────────────────────────────
  const [testStage,  setTestStage]  = useState<TestStage>('intro');
  const [testMode,   setTestMode]   = useState<TestMode>('headset');
  const [currentEar, setCurrentEar] = useState<Ear>('left');
  const [selectedHeadsetId,  setSelectedHeadsetId]  = useState<string | null>(null);
  const [detectedHeadsetId,  setDetectedHeadsetId]  = useState<string | null>(null);
  const [headphoneDetection, setHeadphoneDetection] = useState<HeadphoneDetectionResult | null>(null);

  // ── Channel validation ────────────────────────────────────────────────────
  const [cvTargetEar,   setCvTargetEar]   = useState<Ear>('left');
  const [cvAttempts,    setCvAttempts]    = useState(0);
  const [cvHasPlayed,   setCvHasPlayed]   = useState(false);
  const [cvLastResult,  setCvLastResult]  = useState<'correct' | 'wrong' | null>(null);
  const [cvPlayPending, setCvPlayPending] = useState(false);

  // ── Audio ─────────────────────────────────────────────────────────────────
  const [audioReady, setAudioReady] = useState(false);
  const [isPlaying,  setIsPlaying]  = useState(false);

  // ── H-W algorithm ─────────────────────────────────────────────────────────
  const [freqIndex,       setFreqIndex]       = useState(0);
  const [hwState,         setHwState]         = useState<HWFreqState>(makeInitialHWState());
  const [isSilentTrial,   setIsSilentTrial]   = useState(false);
  const [falsePositives,  setFalsePositives]  = useState(0);
  const [silentCount,     setSilentCount]     = useState(0);
  const [autoPlayPending, setAutoPlayPending] = useState(false);

  // ── Results ───────────────────────────────────────────────────────────────
  const [frequencyResults, setFrequencyResults] = useState<FrequencyThreshold[]>([]);
  const [leftEarResults,   setLeftEarResults]   = useState<FrequencyThreshold[]>([]);
  const [rightEarResults,  setRightEarResults]  = useState<FrequencyThreshold[]>([]);
  const [monoResults,      setMonoResults]      = useState<FrequencyThreshold[]>([]);
  const [isSaving,         setIsSaving]         = useState(false);
  const [isSaved,          setIsSaved]          = useState(false);
  const [saveError,        setSaveError]        = useState<string | null>(null);

  // ── Ref-synced setters ────────────────────────────────────────────────────

  const setHwStateSynced = (s: HWFreqState) => {
    hwStateRef.current = s; setHwState(s);
  };
  const setFreqIndexSynced = (n: number) => {
    freqIndexRef.current = n; setFreqIndex(n);
  };
  const setFrequencyResultsSynced = (r: FrequencyThreshold[]) => {
    frequencyResultsRef.current = r; setFrequencyResults(r);
  };
  const setIsSilentTrialSynced = (v: boolean) => {
    isSilentTrialRef.current = v; setIsSilentTrial(v);
  };
  const setCurrentEarSynced = (e: Ear) => {
    currentEarRef.current = e; setCurrentEar(e);
  };
  const setTestModeSynced = (m: TestMode) => {
    testModeRef.current = m; setTestMode(m);
  };
  const setLeftEarResultsSynced = (r: FrequencyThreshold[]) => {
    leftEarResultsRef.current = r; setLeftEarResults(r);
  };
  const setRightEarResultsSynced = (r: FrequencyThreshold[]) => {
    rightEarResultsRef.current = r; setRightEarResults(r);
  };
  const setMonoResultsSynced = (r: FrequencyThreshold[]) => {
    monoResultsRef.current = r; setMonoResults(r);
  };
  const setSelectedHeadsetIdSynced = (id: string | null) => {
    selectedHeadsetIdRef.current = id; setSelectedHeadsetId(id);
  };

  // ── Platform setup & cleanup ──────────────────────────────────────────────

  useEffect(() => {
    if (isWeb) setAudioReady(true);
  }, [isWeb]);

  useEffect(() => {
    return () => {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
      const engine = webAudioEngineRef.current;
      if (!engine) return;
      if (engine.oscillator)   { try { engine.oscillator.stop(); } catch (_) {} }
      if (engine.audioContext) { engine.audioContext.close().catch(() => {}); }
    };
  }, []);

  // ── Web Audio API ─────────────────────────────────────────────────────────

  const initWebAudio = async () => {
    if (!webAudioEngineRef.current) webAudioEngineRef.current = {};
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) throw new Error('AudioContext unsupported');
    if (!webAudioEngineRef.current.audioContext)
      webAudioEngineRef.current.audioContext = new Ctx();
    const ctx = webAudioEngineRef.current.audioContext;
    if (ctx.state === 'suspended') await ctx.resume();
  };

  const playWebTone = async (frequency: number, vol: number, ear: Ear | 'both') => {
    await initWebAudio();
    const engine = webAudioEngineRef.current!;
    const ctx    = engine.audioContext;
    if (!ctx) return;

    if (engine.oscillator) {
      try { engine.oscillator.stop(); } catch (_) {}
      engine.oscillator = engine.gainNode = engine.panner = undefined;
    }

    const osc    = ctx.createOscillator();
    const gain   = ctx.createGain();
    const panner = ctx.createStereoPanner();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.025);
    panner.pan.value = ear === 'left' ? -1 : ear === 'right' ? 1 : 0;

    osc.connect(panner);
    panner.connect(gain);
    gain.connect(ctx.destination);

    osc.addEventListener('ended', () => {
      if (engine.oscillator === osc) {
        engine.oscillator = engine.gainNode = engine.panner = undefined;
        setIsPlaying(false);
      }
    });

    osc.start();
    osc.stop(ctx.currentTime + 10);
    engine.oscillator = osc;
    engine.gainNode   = gain;
    engine.panner     = panner;
  };

  const stopWebTone = () => {
    const engine = webAudioEngineRef.current;
    if (!engine?.oscillator) return;
    try { engine.oscillator.stop(); } catch (_) {}
    engine.oscillator = engine.gainNode = engine.panner = undefined;
  };

  // ── WebView bridge ────────────────────────────────────────────────────────

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'audio_ready') setAudioReady(true);
      if (data.type === 'tone_ended')  setIsPlaying(false);
      if (data.type === 'play_failed') setIsPlaying(false);
      if (data.type === 'headset_detected') {
        const result = detectFromLabels(data.labels || []);
        setHeadphoneDetection(result);
        if (result.headsetId) setDetectedHeadsetId(result.headsetId);
      }
    } catch (_) {}
  };

  const handleWebViewLoadEnd = () => { if (!audioReady) setAudioReady(true); };

  // ── Channel validation auto-play ──────────────────────────────────────────

  useEffect(() => {
    if (!cvPlayPending || testStage !== 'channel-validation' || !audioReady) return;
    setCvPlayPending(false);

    const ear: Ear = Math.random() < 0.5 ? 'left' : 'right';
    cvTargetEarRef.current = ear;
    setCvTargetEar(ear);
    setCvHasPlayed(true);

    setTimeout(async () => {
      try {
        if (isWeb) {
          await playWebTone(CV_FREQUENCY, CV_VOLUME, ear);
        } else {
          webViewRef.current?.injectJavaScript(
            `window.playTone(${CV_FREQUENCY}, ${CV_VOLUME}, '${ear}'); true;`
          );
        }
        setIsPlaying(true);
      } catch (e) {
        console.warn('CV play failed', e);
      }
    }, 400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cvPlayPending, testStage, audioReady]);

  // ── Test auto-play — reads refs to avoid stale closures ──────────────────

  useEffect(() => {
    if (!autoPlayPending || testStage !== 'testing' || !audioReady) return;
    setAutoPlayPending(false);

    if (isSilentTrialRef.current) return;

    const freq = TEST_FREQUENCIES[freqIndexRef.current];
    const vol  = dbToVolume(hwStateRef.current.currentDb);
    const ear: Ear | 'both' = testModeRef.current === 'speaker' ? 'both' : currentEarRef.current;
    const isi = randomISI();

    if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    autoPlayTimerRef.current = setTimeout(async () => {
      try {
        if (isWeb) {
          await playWebTone(freq, vol, ear);
        } else {
          webViewRef.current?.injectJavaScript(
            `window.playTone(${freq}, ${vol}, '${ear}'); true;`
          );
        }
        toneStartTimeRef.current = Date.now();
        setIsPlaying(true);
      } catch (e) {
        console.warn('Auto-play failed', e);
      }
    }, isi);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlayPending, testStage, audioReady, isWeb]);

  // ── Audio controls ────────────────────────────────────────────────────────

  const stopFrequency = () => {
    if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    if (isWeb) stopWebTone();
    else webViewRef.current?.injectJavaScript(`window.stopTone(); true;`);
    setIsPlaying(false);
  };

  const replayFrequency = async () => {
    stopFrequency();
    if (isSilentTrialRef.current) setIsSilentTrialSynced(false);
    const freq = TEST_FREQUENCIES[freqIndexRef.current];
    const vol  = dbToVolume(hwStateRef.current.currentDb);
    const ear: Ear | 'both' = testModeRef.current === 'speaker' ? 'both' : currentEarRef.current;
    try {
      if (isWeb) {
        await playWebTone(freq, vol, ear);
      } else {
        webViewRef.current?.injectJavaScript(
          `window.playTone(${freq}, ${vol}, '${ear}'); true;`
        );
      }
      toneStartTimeRef.current = Date.now();
      setIsPlaying(true);
    } catch (e) {
      console.warn('Replay failed', e);
    }
  };

  // ── Auto-save ─────────────────────────────────────────────────────────────

  const _autoSave = async ({
    leftRes,
    rightRes,
    monoRes,
  }: {
    leftRes:  FrequencyThreshold[];
    rightRes: FrequencyThreshold[];
    monoRes:  FrequencyThreshold[];
  }) => {
    if (!userId) {
      setIsSaving(false);
      return;
    }

    const completedAt = new Date();
    const startedAt   = testStartedAtRef.current ?? completedAt;
    const durationSec = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000);

    const leftAvg  = leftRes.length  ? averageDb(leftRes)  : null;
    const rightAvg = rightRes.length ? averageDb(rightRes) : null;
    const monoAvg  = monoRes.length  ? averageDb(monoRes)  : null;

    const fp      = falsePositivesRef.current;
    const sc      = silentCountRef.current;
    const fpRatio = sc > 0 ? fp / sc : 0;

    const payload: HearingTestSavePayload = {
      testMode:            testModeRef.current,
      headsetId:           selectedHeadsetIdRef.current,
      leftEarData:         leftRes,
      rightEarData:        rightRes,
      monoData:            monoRes,
      leftAvgDb:           leftAvg,
      rightAvgDb:          rightAvg,
      monoAvgDb:           monoAvg,
      leftScore:           leftAvg  !== null ? calculateHearingScore(leftAvg)  : null,
      rightScore:          rightAvg !== null ? calculateHearingScore(rightAvg) : null,
      monoScore:           monoAvg  !== null ? calculateHearingScore(monoAvg)  : null,
      falsePosRatio:       fpRatio,
      reliable:            sc === 0 || fpRatio <= 0.4,
      ambientDb:           ambientDbRef.current,
      platform:            Platform.OS,
      startedAt,
      completedAt,
      testDurationSeconds: durationSec,
      environmentWarning:  (ambientDbRef.current ?? 0) > 40,
    };

    try {
      const id = await saveHearingTestResult(userId, payload);
      setIsSaving(false);
      if (id) {
        setIsSaved(true);
      } else {
        setSaveError('Échec de la sauvegarde. Vérifiez votre connexion.');
      }
    } catch (_) {
      setIsSaving(false);
      setSaveError('Échec de la sauvegarde. Vérifiez votre connexion.');
    }
  };

  // ── H-W algorithm ─────────────────────────────────────────────────────────

  const finishEarTest = (results: FrequencyThreshold[]) => {
    stopFrequency();
    if (testModeRef.current === 'speaker') {
      setMonoResultsSynced(results);
      setIsSaving(true);
      setTestStage('results');
      _autoSave({ leftRes: [], rightRes: [], monoRes: results });
      return;
    }
    if (currentEarRef.current === 'left') {
      setLeftEarResultsSynced(results);
      setTestStage('ear-transition');
    } else {
      setRightEarResultsSynced(results);
      setIsSaving(true);
      setTestStage('results');
      _autoSave({ leftRes: leftEarResultsRef.current, rightRes: results, monoRes: [] });
    }
  };

  const processHWStep = (heard: boolean) => {
    const { nextState, done, threshold } = hwStep(hwStateRef.current, heard);

    if (done && threshold !== null) {
      const result = buildFrequencyThreshold(
        TEST_FREQUENCIES[freqIndexRef.current],
        threshold,
        nextState,
      );
      const updatedResults = [...frequencyResultsRef.current, result];
      setFrequencyResultsSynced(updatedResults);

      const nextIndex = freqIndexRef.current + 1;
      if (nextIndex < TEST_FREQUENCIES.length) {
        setFreqIndexSynced(nextIndex);
        setHwStateSynced(makeInitialHWState());
        setIsSilentTrialSynced(false);
        setAutoPlayPending(true);
      } else {
        finishEarTest(updatedResults);
      }
      return;
    }

    setHwStateSynced(nextState);
    setIsSilentTrialSynced(Math.random() < SILENT_TRIAL_PROBABILITY);
    setAutoPlayPending(true);
  };

  // ── Unified response handler ──────────────────────────────────────────────

  const handleResponse = (heard: boolean) => {
    const now = Date.now();
    if (now - lastResponseTimeRef.current < MIN_RESPONSE_INTERVAL_MS) return;
    if (now - toneStartTimeRef.current < TONE_START_GUARD_MS) return;
    lastResponseTimeRef.current = now;

    stopFrequency();

    if (isSilentTrialRef.current) {
      if (heard) {
        falsePositivesRef.current += 1;
        setFalsePositives(falsePositivesRef.current);
      }
      silentCountRef.current += 1;
      setSilentCount(silentCountRef.current);
      setIsSilentTrialSynced(false);
      setAutoPlayPending(true);
      return;
    }

    processHWStep(heard);
  };

  // ── Flow actions ──────────────────────────────────────────────────────────

  const proceedFromIntro = () => setTestStage('environment-check');

  const proceedFromEnvironment = () => {
    ambientDbRef.current = ambient.ambientDb;
    setTestStage('headphone-detect');
  };

  const selectMode = (mode: TestMode) => {
    setTestModeSynced(mode);
    if (mode === 'headset') {
      setCvAttempts(0);
      setCvHasPlayed(false);
      setCvLastResult(null);
      setTestStage('channel-validation');
    } else {
      setTestStage('pre-test');
    }
  };

  const playChannelValidation = () => {
    if (!audioReady) return;
    stopFrequency();
    setCvLastResult(null);
    setCvPlayPending(true);
  };

  const handleChannelValidationResponse = (respondedEar: Ear) => {
    const correct = respondedEar === cvTargetEarRef.current;
    setCvLastResult(correct ? 'correct' : 'wrong');

    if (correct) {
      setTimeout(() => setTestStage('headset-select'), 600);
    } else {
      const attempts = cvAttempts + 1;
      setCvAttempts(attempts);
      if (attempts >= CV_MAX_ATTEMPTS) {
        setTimeout(() => setTestStage('headset-select'), 1200);
      } else {
        setTimeout(() => {
          setCvLastResult(null);
          setCvHasPlayed(false);
        }, 1200);
      }
    }
  };

  const skipChannelValidation = () => setTestStage('headset-select');

  const selectHeadset = (modelId: string | null) => {
    setSelectedHeadsetIdSynced(modelId);
    setTestStage('pre-test');
  };

  const startTest = () => {
    if (!audioReady) {
      Alert.alert('Audio non prêt', 'Veuillez patienter quelques secondes…');
      return;
    }
    resetTestState();
    testStartedAtRef.current = new Date();
    setTestStage('testing');
    setAutoPlayPending(true);
  };

  const continueToNextPhase = () => {
    setCurrentEarSynced('right');
    setFreqIndexSynced(0);
    setHwStateSynced(makeInitialHWState());
    setIsSilentTrialSynced(false);
    falsePositivesRef.current = 0;
    setFalsePositives(0);
    silentCountRef.current = 0;
    setSilentCount(0);
    setFrequencyResultsSynced([]);
    setTestStage('testing');
    setAutoPlayPending(true);
  };

  const retrySave = () => {
    setSaveError(null);
    setIsSaved(false);
    setIsSaving(true);
    _autoSave({
      leftRes:  leftEarResultsRef.current,
      rightRes: rightEarResultsRef.current,
      monoRes:  monoResultsRef.current,
    });
  };

  const cancelTest = () => {
    stopFrequency();
    resetTestState();
  };

  const retryTest = () => {
    stopFrequency();
    resetTestState();
    ambient.reset();
    setTestStage('intro');
  };

  const resetTestState = () => {
    setCurrentEarSynced('left');
    setFreqIndexSynced(0);
    setHwStateSynced(makeInitialHWState());
    setIsSilentTrialSynced(false);
    falsePositivesRef.current = 0;
    setFalsePositives(0);
    silentCountRef.current = 0;
    setSilentCount(0);
    setFrequencyResultsSynced([]);
    setLeftEarResultsSynced([]);
    setRightEarResultsSynced([]);
    setMonoResultsSynced([]);
    setAutoPlayPending(false);
    setIsSaving(false);
    setIsSaved(false);
    setSaveError(null);
    testStartedAtRef.current = null;
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const falsePositiveRatio = silentCount > 0 ? falsePositives / silentCount : 0;
  const resultReliable     = falsePositiveRatio <= 0.4;

  const getEarCategory = (results: FrequencyThreshold[]): HearingCategory => {
    if (!results.length) return 'normal';
    const avg = results.reduce((s, r) => s + r.dbLevel, 0) / results.length;
    return getHearingCategory(avg);
  };

  return {
    webViewRef,
    isWeb,
    audioReady,

    // Flow
    testStage,
    testMode,
    currentEar,
    selectedHeadsetId,
    detectedHeadsetId,
    headphoneDetection,

    // Ambient
    ambientStatus: ambient.status,
    ambientDb:     ambient.ambientDb,
    measureAmbient: ambient.measure,
    proceedFromEnvironment,

    // Channel validation
    cvHasPlayed,
    cvAttempts,
    cvLastResult,
    isPlaying,
    playChannelValidation,
    handleChannelValidationResponse,
    skipChannelValidation,

    // Headset selection
    selectHeadset,

    // Testing
    freqIndex,
    totalFrequencies: TEST_FREQUENCIES.length,
    currentFrequency: TEST_FREQUENCIES[freqIndex],
    currentDb:        hwState.currentDb,
    frequencyResults,
    isSilentTrial,
    falsePositives,
    silentCount,
    resultReliable,

    // Results
    leftEarResults,
    rightEarResults,
    monoResults,
    getEarCategory,
    isSaving,
    isSaved,
    saveError,
    retrySave,

    // Actions
    proceedFromIntro,
    selectMode,
    startTest,
    continueToNextPhase,
    cancelTest,
    retryTest,
    handleResponse,
    replayFrequency,

    // WebView bridge
    handleWebViewMessage,
    handleWebViewLoadEnd,
  };
};
