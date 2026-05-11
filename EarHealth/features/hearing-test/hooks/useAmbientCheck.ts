import { requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
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

  const samplesRef  = useRef<number[]>([]);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isWeb       = Platform.OS === 'web';

  // useAudioRecorder manages recorder lifecycle (auto-released on unmount)
  const recorder = useAudioRecorder({ isMeteringEnabled: true });

  const cleanup = async () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (timerRef.current)    { clearTimeout(timerRef.current);     timerRef.current    = null; }
    try { await recorder.stop(); } catch (_) {}
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
      setStatus('ok');
      setAmbientDb(null);
      return;
    }
    const avg = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
    setAmbientDb(avg);
    setStatus(deriveStatus(avg));
  };

  const measureNative = async () => {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      setStatus('ok');
      return;
    }

    await setAudioModeAsync({
      allowsRecording:  true,
      playsInSilentMode: true,
    });

    samplesRef.current = [];
    await recorder.prepareToRecordAsync({ isMeteringEnabled: true });
    recorder.record();

    intervalRef.current = setInterval(() => {
      const state = recorder.getStatus();
      if (state.isRecording && typeof state.metering === 'number') {
        const normalized = Math.max(0, Math.min(120, Math.round(state.metering + 80)));
        samplesRef.current.push(normalized);
      }
    }, SAMPLE_INTERVAL_MS);

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

      intervalRef.current = setInterval(() => {
        analyser.getFloatTimeDomainData(buf);
        let sumSq = 0;
        for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i];
        const rms = Math.sqrt(sumSq / buf.length);
        const db  = 20 * Math.log10(Math.max(rms, 1e-8));
        samplesRef.current.push(Math.max(0, Math.min(120, Math.round(db + 80))));
      }, SAMPLE_INTERVAL_MS);

      timerRef.current = setTimeout(async () => {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        stream.getTracks().forEach(t => t.stop());
        ctx.close().catch(() => {});
        await finishMeasurement();
      }, MEASURE_DURATION_MS);
    } catch (_) {
      setStatus('ok');
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
