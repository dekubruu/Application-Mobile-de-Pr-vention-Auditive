import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  DBFS_TO_DB_OFFSET,
  LEVEL_HISTORY_SIZE,
  MAX_DB,
  getSoundLevelCategory,
} from '../constants/sound-level.constants';

export const useSoundMeter = () => {
  const [isMeasuring,    setIsMeasuring]    = useState(false);
  const [soundLevel,     setSoundLevel]     = useState(0);
  const [averageLevel,   setAverageLevel]   = useState(0);
  const [statusMessage,  setStatusMessage]  = useState('Prêt');
  // Raw metering value in dBFS, surfaced only in __DEV__ for on-device
  // calibration diagnostics (null when not measuring or in production).
  const [rawDbfs,        setRawDbfs]        = useState<number | null>(null);

  const webAudioContextRef = useRef<AudioContext | null>(null);
  const analyserRef        = useRef<AnalyserNode | null>(null);
  const webSourceRef       = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef             = useRef<number | null>(null);
  const intervalRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const levelHistoryRef    = useRef<number[]>([]);

  const isWeb = Platform.OS === 'web';

  // useAudioRecorder manages lifecycle — auto-released on unmount.
  // Spread HIGH_QUALITY preset to satisfy the full RecordingOptions type, and
  // enable metering. HIGH_QUALITY records linear-ish high-fidelity audio, which
  // is the rawest signal expo-audio exposes (the SDK has no AGC/noise-
  // suppression toggle — see the web path for the constraints we CAN disable).
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });

  useEffect(() => {
    return () => {
      stopWebMeter();
      stopNativeMeter();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalizeDb = (db: number) => Math.max(0, Math.min(MAX_DB, Math.round(db)));

  const updateSoundLevel = (level: number) => {
    setSoundLevel(level);
    const history = levelHistoryRef.current;
    history.push(level);
    if (history.length > LEVEL_HISTORY_SIZE) history.shift();
    levelHistoryRef.current = history;
    const average = Math.round(
      history.reduce((sum, v) => sum + v, 0) / Math.max(history.length, 1),
    );
    setAverageLevel(average);
  };

  // ── Web measurement ───────────────────────────────────────────────────────

  const handleWebMeter = (analyser: AnalyserNode) => {
    const dataArray = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(dataArray);

    let sumSquares = 0;
    for (let i = 0; i < dataArray.length; i++) sumSquares += dataArray[i] * dataArray[i];
    const rms = Math.sqrt(sumSquares / dataArray.length);
    let db = 20 * Math.log10(rms);
    if (!isFinite(db)) db = -160;

    if (__DEV__) setRawDbfs(db);
    updateSoundLevel(normalizeDb(db + DBFS_TO_DB_OFFSET));
    rafRef.current = window.requestAnimationFrame(() => handleWebMeter(analyser));
  };

  const startWebMeter = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatusMessage('Microphone non supporté par le navigateur');
        return;
      }
      // Disable the browser's automatic input processing so the meter sees the
      // raw signal — AGC in particular compresses loud input and would cap the
      // reading (hypothesis b). These constraints are best-effort: a browser
      // may ignore unsupported ones.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      const AudioContextClass =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        setStatusMessage('AudioContext non supporté');
        return;
      }
      const audioContext = new AudioContextClass();
      await audioContext.resume();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0.85;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      webAudioContextRef.current = audioContext;
      analyserRef.current        = analyser;
      webSourceRef.current       = source;

      handleWebMeter(analyser);
      setStatusMessage('Mesure en cours');
    } catch {
      setStatusMessage('Permission microphone refusée');
    }
  };

  const stopWebMeter = () => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (webAudioContextRef.current) {
      webAudioContextRef.current.close().catch(() => null);
      webAudioContextRef.current = null;
    }
    if (webSourceRef.current) {
      webSourceRef.current.mediaStream.getTracks().forEach(t => t.stop());
      webSourceRef.current = null;
    }
    analyserRef.current = null;
  };

  // ── Native measurement (expo-audio) ──────────────────────────────────────

  const startNativeMeter = async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setStatusMessage('Autorisation microphone refusée');
        return;
      }
      await setAudioModeAsync({
        allowsRecording:   true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync({ isMeteringEnabled: true });
      recorder.record();

      intervalRef.current = setInterval(() => {
        const state = recorder.getStatus();
        if (state.isRecording && typeof state.metering === 'number') {
          if (__DEV__) setRawDbfs(state.metering);
          updateSoundLevel(normalizeDb(state.metering + DBFS_TO_DB_OFFSET));
        }
      }, 200);

      setStatusMessage('Mesure en cours');
    } catch {
      setStatusMessage('Échec démarrage microphone');
    }
  };

  const stopNativeMeter = async () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    try { await recorder.stop(); } catch {}
  };

  // ── Public API ────────────────────────────────────────────────────────────

  const startMeasurement = async () => {
    setSoundLevel(0);
    setRawDbfs(null);
    setIsMeasuring(true);
    setStatusMessage('Démarrage...');
    if (isWeb) await startWebMeter();
    else        await startNativeMeter();
  };

  const stopMeasurement = async () => {
    setIsMeasuring(false);
    setStatusMessage('Arrêté');
    setSoundLevel(0);
    setRawDbfs(null);
    if (isWeb) stopWebMeter();
    else        await stopNativeMeter();
  };

  const toggleMeasure = async () => {
    if (isMeasuring) await stopMeasurement();
    else              await startMeasurement();
  };

  return {
    isWeb,
    isMeasuring,
    soundLevel,
    averageLevel,
    statusMessage,
    rawDbfs,
    category: getSoundLevelCategory(soundLevel),
    toggleMeasure,
  };
};
