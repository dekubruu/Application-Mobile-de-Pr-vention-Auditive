import { Audio } from 'expo-av';
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

  // ── Platform setup & cleanup ──────────────────────────────────────────────

  useEffect(() => {
    if (isWeb) {
      setAudioReady(true);
      return;
    }

    // FIX: Configure iOS AVAudioSession so sound plays even in silent/ring mode.
    // This also ensures the WebView audio is routed through the playback session.
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    }).catch((err) => console.warn('Audio session setup failed', err));
  }, [isWeb]);

  // FIX: Release Web Audio resources when the screen unmounts so the
  // AudioContext is closed and the oscillator thread is freed.
  useEffect(() => {
    return () => {
      const engine = webAudioEngineRef.current;
      if (!engine) return;
      if (engine.oscillator) {
        try { engine.oscillator.stop(); } catch (e) {}
        engine.oscillator = undefined;
      }
      if (engine.audioContext) {
        engine.audioContext.close().catch(() => {});
        engine.audioContext = undefined;
      }
      engine.gainNode = undefined;
    };
  }, []);

  // ── Web Audio API (browser platform only) ────────────────────────────────

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

    // FIX: explicitly stop and clear both nodes before creating new ones.
    if (engine.oscillator) {
      try { engine.oscillator.stop(); } catch (e) {}
      engine.oscillator = undefined;
      engine.gainNode = undefined;
    }

    const oscillator = engine.audioContext.createOscillator();
    const gainNode = engine.audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, engine.audioContext.currentTime);
    gainNode.gain.setValueAtTime(vol, engine.audioContext.currentTime);
    oscillator.connect(gainNode);
    gainNode.connect(engine.audioContext.destination);

    // FIX: sync React isPlaying state when the oscillator auto-stops at T+10.
    oscillator.addEventListener('ended', () => {
      if (engine.oscillator === oscillator) {
        engine.oscillator = undefined;
        engine.gainNode = undefined;
        setIsPlaying(false);
      }
    });

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
    // FIX: always clear gainNode to prevent stale volume updates after stop.
    if (engine) engine.gainNode = undefined;
  };

  const setWebToneVolume = (vol: number) => {
    if (!isWeb) return;
    const engine = webAudioEngineRef.current;
    if (engine?.gainNode && engine.audioContext) {
      engine.gainNode.gain.setValueAtTime(vol, engine.audioContext.currentTime);
    }
  };

  // ── WebView bridge (iOS / Android) ────────────────────────────────────────

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      switch (data.type) {
        case 'audio_ready':
          setAudioReady(true);
          break;
        // FIX: WebView notifies RN when the oscillator auto-stops (T+10 s).
        // This keeps isPlaying in sync without polling.
        case 'tone_ended':
          setIsPlaying(false);
          break;
        case 'play_failed':
          // Audio context couldn't resume — mark as not playing.
          setIsPlaying(false);
          console.warn('WebView audio play failed, reason:', data.reason);
          break;
      }
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
      webViewRef.current?.injectJavaScript(`window.playTone(${currentFrequency}, ${volume}); true;`);
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
    setResults((prev) => [...prev, { frequency: currentFrequency, heard: true, timestamp: Date.now() }]);

    const newLowerBound = Math.max(lowerBound, currentFrequency);
    const newPrecision = upperBound - newLowerBound;

    if (newPrecision < FREQUENCY_PRECISION_THRESHOLD) {
      setHearingThreshold((newLowerBound + upperBound) / 2);
      setTestCompleted(true);
      return;
    }

    let nextFrequency: number;
    if (testPhase === 'ascending') {
      nextFrequency = currentFrequency < ASCENDING_PHASE_DOUBLE_UNTIL
        ? currentFrequency * 2
        : currentFrequency + ASCENDING_PHASE_STEP;
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
    setResults((prev) => [...prev, { frequency: currentFrequency, heard: false, timestamp: Date.now() }]);

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
