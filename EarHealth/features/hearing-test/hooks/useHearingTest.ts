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
  const toneStartTimeRef    = useRef(0); // for response-before-tone guard
  const isWeb               = Platform.OS === 'web';

  // ── Refs for algorithm state (immune to React Compiler stale closures) ────
  const hwStateRef            = useRef<HWFreqState>(makeInitialHWState());
  const freqIndexRef          = useRef(0);
  const frequencyResultsRef   = useRef<FrequencyThreshold[]>([]);
  const isSilentTrialRef      = useRef(false);
  const currentEarRef         = useRef<Ear>('left');
  const testModeRef           = useRef<TestMode>('headset');
  const cvTargetEarRef        = useRef<Ear>('left');

  // ── Ambient noise (from dedicated hook) ──────────────────────────────────
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

    if (isSilentTrialRef.current) return; // no tone for silent trial

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

  // ── H-W algorithm ─────────────────────────────────────────────────────────

  const finishEarTest = (results: FrequencyThreshold[]) => {
    stopFrequency();
    if (testModeRef.current === 'speaker') {
      setMonoResults(results);
      setTestStage('results');
      return;
    }
    if (currentEarRef.current === 'left') {
      setLeftEarResults(results);
      setTestStage('ear-transition');
    } else {
      setRightEarResults(results);
      setTestStage('results');
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
    // Debounce rapid taps
    if (now - lastResponseTimeRef.current < MIN_RESPONSE_INTERVAL_MS) return;
    // Guard: ignore response if tone just started (likely touch carry-over)
    if (now - toneStartTimeRef.current < TONE_START_GUARD_MS) return;
    lastResponseTimeRef.current = now;

    stopFrequency();

    if (isSilentTrialRef.current) {
      if (heard) setFalsePositives(prev => prev + 1);
      setSilentCount(prev => prev + 1);
      setIsSilentTrialSynced(false);
      setAutoPlayPending(true);
      return;
    }

    processHWStep(heard);
  };

  // ── Flow actions ──────────────────────────────────────────────────────────

  // Step 1: from intro
  const proceedFromIntro = () => setTestStage('environment-check');

  // Step 2: from environment-check
  const proceedFromEnvironment = () => setTestStage('headphone-detect');

  // Step 3: from headphone-detect
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

  // Step 4: channel validation
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

  // Step 5: headset select
  const selectHeadset = (modelId: string | null) => {
    setSelectedHeadsetId(modelId);
    setTestStage('pre-test');
  };

  // Step 6: pre-test
  const startTest = () => {
    if (!audioReady) {
      Alert.alert('Audio non prêt', 'Veuillez patienter quelques secondes…');
      return;
    }
    resetTestState();
    setTestStage('testing');
    setAutoPlayPending(true);
  };

  // Step 7/8: ear transition
  const continueToNextPhase = () => {
    setCurrentEarSynced('right');
    setFreqIndexSynced(0);
    setHwStateSynced(makeInitialHWState());
    setIsSilentTrialSynced(false);
    setFalsePositives(0);
    setSilentCount(0);
    setFrequencyResultsSynced([]);
    setTestStage('testing');
    setAutoPlayPending(true);
  };

  // Results save
  const saveResults = async () => {
    if (!userId) return;
    const leftAvg  = leftEarResults.length  ? averageDb(leftEarResults)  : null;
    const rightAvg = rightEarResults.length ? averageDb(rightEarResults) : null;
    const monoAvg  = monoResults.length     ? averageDb(monoResults)     : null;

    const payload: HearingTestSavePayload = {
      testMode:      testMode,
      headsetId:     selectedHeadsetId,
      leftEarData:   leftEarResults,
      rightEarData:  rightEarResults,
      monoData:      monoResults,
      leftAvgDb:     leftAvg,
      rightAvgDb:    rightAvg,
      monoAvgDb:     monoAvg,
      leftScore:     leftAvg  !== null ? calculateHearingScore(leftAvg)  : null,
      rightScore:    rightAvg !== null ? calculateHearingScore(rightAvg) : null,
      falsePosRatio: silentCount > 0 ? falsePositives / silentCount : 0,
      reliable:      silentCount === 0 || falsePositives / silentCount <= 0.4,
      ambientDb:     ambient.ambientDb,
    };

    const id = await saveHearingTestResult(userId, payload);
    if (!id) setSaveError('Échec de la sauvegarde. Vérifiez votre connexion.');
  };

  const cancelTest = () => {
    stopFrequency();
    resetTestState();
    setTestStage('pre-test');
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
    setFalsePositives(0);
    setSilentCount(0);
    setFrequencyResultsSynced([]);
    setLeftEarResults([]);
    setRightEarResults([]);
    setMonoResults([]);
    setAutoPlayPending(false);
    setSaveError(null);
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
    saveResults,
    saveError,

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
