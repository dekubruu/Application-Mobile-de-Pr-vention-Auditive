import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import { Colors } from '../../constants/colors';

export default function SoundMeterScreen() {
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

  useEffect(() => {
    return () => {
      stopMeasurement();
    };
  }, []);

  const normalizeDb = (db: number) => {
    return Math.max(0, Math.min(120, Math.round(db)));
  };

  const updateSoundLevel = (level: number) => {
    setSoundLevel(level);
    const history = levelHistoryRef.current;
    history.push(level);
    if (history.length > 10) {
      history.shift();
    }
    levelHistoryRef.current = history;
    const average = Math.round(
      history.reduce((sum, value) => sum + value, 0) / Math.max(history.length, 1)
    );
    setAverageLevel(average);
  };

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
    if (!isFinite(db)) {
      db = -160;
    }

    const approxDb = normalizeDb(db + 80);
    updateSoundLevel(approxDb);

    rafRef.current = window.requestAnimationFrame(() => handleWebMeter(analyser));
  };

  const startWebMeter = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
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
      const tracks = webSourceRef.current.mediaStream.getTracks();
      tracks.forEach((track) => track.stop());
      webSourceRef.current = null;
    }

    analyserRef.current = null;
  };

  const handleRecordingStatus = (status: any) => {
    if (!status.isRecording) return;
    if (typeof status.metering === 'number') {
      const level = normalizeDb(status.metering + 80);
      updateSoundLevel(level);
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
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
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

  const barWidth = Math.min(soundLevel, 100);
  const barColor =
    soundLevel <= 40
      ? '#16A34A'
      : soundLevel <= 70
      ? '#2563EB'
      : soundLevel <= 85
      ? '#F59E0B'
      : soundLevel <= 100
      ? '#F97316'
      : soundLevel <= 120
      ? '#EF4444'
      : '#7F1D1D';

  const getCategory = (level: number) => {
    if (level <= 40) return 'Silencieux';
    if (level <= 70) return 'Modéré';
    if (level <= 85) return 'Attention';
    if (level <= 100) return 'Nocif';
    if (level <= 120) return 'Très Nocif';
    return 'Dangereux';
  };

  const getCategoryDescription = (level: number) => {
    if (level <= 40)
      return 'Bibliothèque, chuchotement, bruit de feuilles. Sûr pour une exposition prolongée.';
    if (level <= 70)
      return 'Conversation normale, bureau calme. Généralement sûr pour une exposition prolongée.';
    if (level <= 85)
      return 'Trafic intense, aspirateur. Une exposition prolongée peut causer de la fatigue.';
    if (level <= 100)
      return 'Outils électriques, moto. Une exposition de plus de 8h peut endommager l’audition.';
    if (level <= 120)
      return 'Tronçonneuse, sirène. Quelques minutes d’exposition peuvent causer des dommages.';
    return 'Moteur d’avion, feu d’artifice. Risque immédiat de dommages auditifs.';
  };

  const category = getCategory(soundLevel);
  const description = getCategoryDescription(soundLevel);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Sonomètre</Text>
        <Text style={styles.level}>{soundLevel} dB</Text>
        <Text style={styles.subTitle}>{category}</Text>
        <Text style={styles.average}>Moyenne: {averageLevel} dB</Text>

        <View style={styles.indicator}>
          <View style={[styles.bar, { width: barWidth, backgroundColor: barColor }]} />
        </View>

        <TouchableOpacity
          style={[styles.button, isMeasuring ? styles.buttonStop : styles.buttonStart]}
          onPress={toggleMeasure}
        >
          <Text style={styles.buttonText}>{isMeasuring ? 'Arrêter' : 'Démarrer'}</Text>
        </TouchableOpacity>

        <Text style={styles.info}>{statusMessage}</Text>
        <Text style={styles.help}>
          {isWeb
            ? 'Autorisez le microphone dans le navigateur.'
            : 'Autorisez le microphone sur votre appareil.'}
        </Text>

        <View style={styles.guideCard}>
          <Text style={styles.guideTitle}>Guide des niveaux sonores</Text>
          <View style={styles.guideRow}>
            <View style={[styles.guideDot, { backgroundColor: '#16A34A' }]} />
            <Text style={styles.guideText}>0-40 dB - Silencieux : sûr pour toutes les durées.</Text>
          </View>
          <View style={styles.guideRow}>
            <View style={[styles.guideDot, { backgroundColor: '#2563EB' }]} />
            <Text style={styles.guideText}>40-70 dB - Modéré : conversation normale, bureau calme.</Text>
          </View>
          <View style={styles.guideRow}>
            <View style={[styles.guideDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.guideText}>70-85 dB - Attention : trafic intense, aspirateur.</Text>
          </View>
          <View style={styles.guideRow}>
            <View style={[styles.guideDot, { backgroundColor: '#F97316' }]} />
            <Text style={styles.guideText}>85-100 dB - Nocif : outils électriques, moto.</Text>
          </View>
          <View style={styles.guideRow}>
            <View style={[styles.guideDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.guideText}>100-120 dB - Très Nocif : tronçonneuse, sirène.</Text>
          </View>
          <View style={styles.guideRow}>
            <View style={[styles.guideDot, { backgroundColor: '#7F1D1D' }]} />
            <Text style={styles.guideText}>120+ dB - Dangereux : avion, feux d’artifice.</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 40,
    color: Colors.text,
  },
  level: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 30,
  },
  indicator: {
    width: '100%',
    height: 30,
    backgroundColor: '#E5E7EB',
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 40,
  },
  bar: {
    height: '100%',
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginBottom: 20,
  },
  buttonStart: {
    backgroundColor: Colors.primary,
  },
  buttonStop: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  subTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  average: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 18,
  },
  info: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  help: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  guideCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  guideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  guideDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  guideText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
  },
});