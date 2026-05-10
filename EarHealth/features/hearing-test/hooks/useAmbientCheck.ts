import { Audio } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { AMBIENT_OK_DB, AMBIENT_WARN_DB } from '../constants/hearing-test.constants';
import type { AmbientStatus } from '../types/hearing-test.types';

const MEASURE_DURATION_MS = 5000;
const SAMPLE_INTERVAL_MS  = 200;

export interface AmbientCheckResult {
  status:    AmbientStatus;
  ambientDb: number | null;
  measure:   () => Promise<void>;
  reset:     () => void;
}

export function useAmbientCheck(): AmbientCheckResult {
  const [status,    setStatus]    = useState<AmbientStatus>('idle');
  const [ambientDb, setAmbientDb] = useState<number | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const samplesRef   = useRef<number[]>([]);
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isWeb        = Platform.OS === 'web';

  const cleanup = async () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (_) {}
      recordingRef.current = null;
    }
  };

  useEffect(() => {
    return () => { cleanup(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deriveStatus = (db: number): AmbientStatus => {
    if (db <= AMBIENT_OK_DB)   return 'ok';
    if (db <= AMBIENT_WARN_DB) return 'warning';
    return 'loud';
  };

  const finishMeasurement = async () => {
    await cleanup();
    const samples = samplesRef.current;
    if (!samples.length) {
      setStatus('ok'); // permission denied or empty — don't block the test
      setAmbientDb(null);
      return;
    }
    const avg = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
    setAmbientDb(avg);
    setStatus(deriveStatus(avg));
  };

  const measureNative = async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      setStatus('ok'); // graceful degradation — don't block the test
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    samplesRef.current = [];
    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);

    recording.setOnRecordingStatusUpdate((status) => {
      if (!status.isRecording) return;
      if (typeof status.metering === 'number') {
        const normalized = Math.max(0, Math.min(120, Math.round(status.metering + 80)));
        samplesRef.current.push(normalized);
      }
    });
    recording.setProgressUpdateInterval(SAMPLE_INTERVAL_MS);

    await recording.startAsync();
    recordingRef.current = recording;

    timerRef.current = setTimeout(finishMeasurement, MEASURE_DURATION_MS);
  };

  const measureWeb = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('ok');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AC     = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) { setStatus('ok'); return; }

      const ctx      = new AC();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      samplesRef.current = [];
      const buf = new Float32Array(analyser.fftSize);

      const intervalId = setInterval(() => {
        analyser.getFloatTimeDomainData(buf);
        let sumSq = 0;
        for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i];
        const rms = Math.sqrt(sumSq / buf.length);
        const db  = 20 * Math.log10(Math.max(rms, 1e-8));
        samplesRef.current.push(Math.max(0, Math.min(120, Math.round(db + 80))));
      }, SAMPLE_INTERVAL_MS);

      timerRef.current = setTimeout(async () => {
        clearInterval(intervalId);
        stream.getTracks().forEach(t => t.stop());
        ctx.close().catch(() => {});
        await finishMeasurement();
      }, MEASURE_DURATION_MS);
    } catch (_) {
      setStatus('ok'); // mic denied — don't block the test
    }
  };

  const measure = useCallback(async () => {
    setStatus('measuring');
    setAmbientDb(null);
    samplesRef.current = [];
    if (isWeb) {
      await measureWeb();
    } else {
      await measureNative();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWeb]);

  const reset = useCallback(() => {
    cleanup();
    setStatus('idle');
    setAmbientDb(null);
  }, []);

  return { status, ambientDb, measure, reset };
}
