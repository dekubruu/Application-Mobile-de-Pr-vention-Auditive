import { Audio } from 'expo-av';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { LEVEL_HISTORY_SIZE, getSoundLevelCategory } from '../constants/sound-level.constants';

export const useSoundMeter = () => {
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [soundLevel, setSoundLevel] = useState(0);
  const [averageLevel, setAverageLevel] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Prêt');

  const recordingRef = useRef<Audio.Recording | null>(null);
  const webAudioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const webSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const levelHistoryRef = useRef<number[]>([]);

  const isWeb = Platform.OS === 'web';

  // cleanup on unmount
  useEffect(() => {
    return () => {
      stopWebMeter();
      stopNativeMeter();
    };
  }, []);

  const normalizeDb = (db: number) => Math.max(0, Math.min(120, Math.round(db)));

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
    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);
    analyser.getFloatTimeDomainData(dataArray);

    let sumSquares = 0;
    for (let i = 0; i < bufferLength; i++) {
      sumSquares += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sumSquares / bufferLength);
    let db = 20 * Math.log10(rms);
    if (!isFinite(db)) db = -160;

    updateSoundLevel(normalizeDb(db + 80));
    rafRef.current = window.requestAnimationFrame(() => handleWebMeter(analyser));
  };

  const startWebMeter = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatusMessage('Microphone non supporté par le navigateur');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
      analyserRef.current = analyser;
      webSourceRef.current = source;

      handleWebMeter(analyser);
      setStatusMessage('Mesure en cours');
    } catch (error) {
      console.error(error);
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
      webSourceRef.current.mediaStream.getTracks().forEach((t) => t.stop());
      webSourceRef.current = null;
    }
    analyserRef.current = null;
  };

  // ── Native measurement (expo-av) ──────────────────────────────────────────

  const handleRecordingStatus = (status: any) => {
    if (!status.isRecording) return;
    if (typeof status.metering === 'number') {
      updateSoundLevel(normalizeDb(status.metering + 80));
    }
  };

  const startNativeMeter = async () => {
    try {
      const response = await Audio.requestPermissionsAsync();
      if (!response.granted) {
        setStatusMessage('Autorisation microphone refusée');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recording.setOnRecordingStatusUpdate(handleRecordingStatus);
      recording.setProgressUpdateInterval(200);
      await recording.startAsync();
      recordingRef.current = recording;
      setStatusMessage('Mesure en cours');
    } catch (error) {
      console.error(error);
      setStatusMessage('Échec démarrage microphone');
    }
  };

  const stopNativeMeter = async () => {
    try {
      const recording = recordingRef.current;
      if (recording) {
        await recording.stopAndUnloadAsync();
        recordingRef.current = null;
      }
    } catch (error) {
      console.error(error);
    }
  };

  // ── Public API ────────────────────────────────────────────────────────────

  const startMeasurement = async () => {
    setSoundLevel(0);
    setIsMeasuring(true);
    setStatusMessage('Démarrage...');
    if (isWeb) {
      await startWebMeter();
    } else {
      await startNativeMeter();
    }
  };

  const stopMeasurement = async () => {
    setIsMeasuring(false);
    setStatusMessage('Arrêté');
    setSoundLevel(0);
    if (isWeb) {
      stopWebMeter();
    } else {
      await stopNativeMeter();
    }
  };

  const toggleMeasure = async () => {
    if (isMeasuring) {
      await stopMeasurement();
    } else {
      await startMeasurement();
    }
  };

  const category = getSoundLevelCategory(soundLevel);

  return {
    isWeb,
    isMeasuring,
    soundLevel,
    averageLevel,
    statusMessage,
    category,
    toggleMeasure,
  };
};
