import { useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import {
  ASCENDING_PHASE_DOUBLE_UNTIL,
  ASCENDING_PHASE_STEP,
  DEFAULT_UPPER_BOUND,
  DEFAULT_VOLUME,
  FREQUENCY_MAX,
  FREQUENCY_PRECISION_THRESHOLD,
  FREQUENCY_START,
} from '../constants/hearing-test.constants';
import type { TestPhase, TestResult, WebAudioEngine } from '../types/hearing-test.types';

export const useHearingTest = () => {
  const webViewRef = useRef<WebView>(null);
  const webAudioEngineRef = useRef<WebAudioEngine | null>(null);
  const isWeb = Platform.OS === 'web';

  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [results, setResults] = useState<TestResult[]>([]);
  const [audioReady, setAudioReady] = useState(false);
  const [currentFrequency, setCurrentFrequency] = useState(FREQUENCY_START);
  const [testPhase, setTestPhase] = useState<TestPhase>('ascending');
  const [lowerBound, setLowerBound] = useState(0);
  const [upperBound, setUpperBound] = useState(DEFAULT_UPPER_BOUND);
  const [precision, setPrecision] = useState(DEFAULT_UPPER_BOUND);
  const [hearingThreshold, setHearingThreshold] = useState<number | null>(null);

  useEffect(() => {
    if (isWeb) setAudioReady(true);
  }, [isWeb]);

  // ── Web Audio (direct, for browser platform) ──────────────────────────────

  const initWebAudio = async () => {
    if (!isWeb) return;
    if (!webAudioEngineRef.current) webAudioEngineRef.current = {};
    const AudioContextClass =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) throw new Error('AudioContext unsupported');
    if (!webAudioEngineRef.current.audioContext) {
      webAudioEngineRef.current.audioContext = new AudioContextClass();
    }
    if (webAudioEngineRef.current.audioContext.state === 'suspended') {
      await webAudioEngineRef.current.audioContext.resume();
    }
  };

  const playWebTone = async (frequency: number, vol: number) => {
    if (!isWeb) return;
    await initWebAudio();
    const engine = webAudioEngineRef.current;
    if (!engine?.audioContext) return;
    if (engine.oscillator) {
      try { engine.oscillator.stop(); } catch (e) {}
    }
    const oscillator = engine.audioContext.createOscillator();
    const gainNode = engine.audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, engine.audioContext.currentTime);
    gainNode.gain.setValueAtTime(vol, engine.audioContext.currentTime);
    oscillator.connect(gainNode);
    gainNode.connect(engine.audioContext.destination);
    oscillator.start();
    oscillator.stop(engine.audioContext.currentTime + 10);
    engine.oscillator = oscillator;
    engine.gainNode = gainNode;
  };

  const stopWebTone = () => {
    if (!isWeb) return;
    const engine = webAudioEngineRef.current;
    if (engine?.oscillator) {
      try { engine.oscillator.stop(); } catch (e) {}
      engine.oscillator = undefined;
    }
  };

  const setWebToneVolume = (vol: number) => {
    if (!isWeb) return;
    const engine = webAudioEngineRef.current;
    if (engine?.gainNode && engine.audioContext) {
      engine.gainNode.gain.setValueAtTime(vol, engine.audioContext.currentTime);
    }
  };

  // ── WebView bridge message handlers ──────────────────────────────────────

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'audio_ready') setAudioReady(true);
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  const handleWebViewLoadEnd = () => {
    if (!audioReady) setAudioReady(true);
  };

  // ── Test control ──────────────────────────────────────────────────────────

  const startTest = () => {
    if (!audioReady) {
      Alert.alert('Audio non prêt', 'Veuillez patienter quelques secondes...');
      return;
    }
    try {
      setTestStarted(true);
      setTestCompleted(false);
      setResults([]);
      setCurrentFrequency(FREQUENCY_START);
      setTestPhase('ascending');
      setLowerBound(0);
      setUpperBound(DEFAULT_UPPER_BOUND);
      setPrecision(DEFAULT_UPPER_BOUND);
      setHearingThreshold(null);
      setIsPlaying(false);
    } catch {
      Alert.alert('Erreur', 'Impossible de démarrer le test');
    }
  };

  const playFrequency = async () => {
    if (!audioReady) return;
    if (isWeb) {
      await playWebTone(currentFrequency, volume);
    } else {
      webViewRef.current?.injectJavaScript(`
        (async function() {
          if (window.initAudio) {
            try { await window.initAudio(); } catch (e) { console.warn('Audio init failed', e); }
          }
          window.playTone(${currentFrequency}, ${volume});
        })();
        true;
      `);
    }
    setIsPlaying(true);
  };

  const stopFrequency = () => {
    if (isWeb) {
      stopWebTone();
    } else {
      webViewRef.current?.injectJavaScript(`window.stopTone(); true;`);
    }
    setIsPlaying(false);
  };

  const updateVolume = (newVolume: number) => {
    setVolume(newVolume);
    if (isPlaying) {
      if (isWeb) {
        setWebToneVolume(newVolume);
      } else {
        webViewRef.current?.injectJavaScript(`window.setVolume(${newVolume}); true;`);
      }
    }
  };

  // ── Response handlers (test algorithm) ───────────────────────────────────

  const handleHeard = () => {
    stopFrequency();
    const newResult: TestResult = {
      frequency: currentFrequency,
      heard: true,
      timestamp: Date.now(),
    };
    setResults((prev) => [...prev, newResult]);

    const newLowerBound = Math.max(lowerBound, currentFrequency);
    const newPrecision = upperBound - newLowerBound;

    if (newPrecision < FREQUENCY_PRECISION_THRESHOLD) {
      setHearingThreshold((newLowerBound + upperBound) / 2);
      setTestCompleted(true);
      return;
    }

    let nextFrequency: number;
    if (testPhase === 'ascending') {
      if (currentFrequency < ASCENDING_PHASE_DOUBLE_UNTIL) {
        nextFrequency = currentFrequency * 2;
      } else {
        nextFrequency = currentFrequency + ASCENDING_PHASE_STEP;
      }
      if (nextFrequency > FREQUENCY_MAX) {
        nextFrequency = (newLowerBound + upperBound) / 2;
        setTestPhase('binary-search');
      }
    } else {
      nextFrequency = (newLowerBound + upperBound) / 2;
    }

    setCurrentFrequency(Math.round(nextFrequency));
    setLowerBound(newLowerBound);
    setPrecision(newPrecision);
  };

  const handleNotHeard = () => {
    stopFrequency();
    const newResult: TestResult = {
      frequency: currentFrequency,
      heard: false,
      timestamp: Date.now(),
    };
    setResults((prev) => [...prev, newResult]);

    const newUpperBound = Math.min(upperBound, currentFrequency);
    const newPrecision = newUpperBound - lowerBound;

    if (newPrecision < FREQUENCY_PRECISION_THRESHOLD) {
      setHearingThreshold((lowerBound + newUpperBound) / 2);
      setTestCompleted(true);
      return;
    }

    setCurrentFrequency(Math.round((lowerBound + newUpperBound) / 2));
    setUpperBound(newUpperBound);
    setPrecision(newPrecision);
    setTestPhase('binary-search');
  };

  const cancelTest = () => {
    stopFrequency();
    setTestStarted(false);
    setResults([]);
  };

  return {
    webViewRef,
    isWeb,
    audioReady,
    testStarted,
    testCompleted,
    isPlaying,
    volume,
    currentFrequency,
    testPhase,
    precision,
    hearingThreshold,
    results,
    startTest,
    cancelTest,
    playFrequency,
    stopFrequency,
    updateVolume,
    handleHeard,
    handleNotHeard,
    handleWebViewMessage,
    handleWebViewLoadEnd,
  };
};
