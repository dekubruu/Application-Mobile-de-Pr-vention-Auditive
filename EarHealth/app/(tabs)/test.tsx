// app/test.tsx - VERSION AVEC WEB AUDIO API
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Colors } from '../../constants/colors';

/**
 * MODIFICATIONS APPLIQUÉES:
 * 
 * ✅ Suppression de AudioGeneratorService
 * ✅ Intégration Web Audio API via WebView
 * ✅ Support iOS, Android et Web
 * ✅ Son joué SEULEMENT quand on clique "Jouer"
 * ✅ Progression: ×2 jusqu'à 8kHz, puis +2kHz jusqu'à 24kHz
 * ✅ Boutons cliquables PENDANT que le son joue
 */

interface TestResult {
  frequency: number;
  heard: boolean;
  timestamp: number;
}

export default function TestScreen() {
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);
  const webAudioEngineRef = useRef<{
    audioContext?: any;
    oscillator?: any;
    gainNode?: any;
  }>(null);
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    if (isWeb) {
      setAudioReady(true);
    }
  }, [isWeb]);

  const initWebAudio = async () => {
    if (!isWeb) return;
    if (!webAudioEngineRef.current) {
      webAudioEngineRef.current = {};
    }

    const AudioContextClass =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error('AudioContext unsupported');
    }

    if (!webAudioEngineRef.current.audioContext) {
      webAudioEngineRef.current.audioContext = new AudioContextClass();
    }

    if (webAudioEngineRef.current.audioContext.state === 'suspended') {
      await webAudioEngineRef.current.audioContext.resume();
    }
  };

  const playWebTone = async (frequency: number, volume: number) => {
    if (!isWeb) return;
    await initWebAudio();
    const engine = webAudioEngineRef.current;
    if (!engine?.audioContext) return;

    if (engine.oscillator) {
      try {
        engine.oscillator.stop();
      } catch (e) {
        // already stopped
      }
    }

    const oscillator = engine.audioContext.createOscillator();
    const gainNode = engine.audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(
      frequency,
      engine.audioContext.currentTime
    );
    gainNode.gain.setValueAtTime(volume, engine.audioContext.currentTime);

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
      try {
        engine.oscillator.stop();
      } catch (e) {
        // already stopped
      }
      engine.oscillator = undefined;
    }
  };

  const setWebToneVolume = (volume: number) => {
    if (!isWeb) return;
    const engine = webAudioEngineRef.current;
    if (engine?.gainNode && engine.audioContext) {
      engine.gainNode.gain.setValueAtTime(
        volume,
        engine.audioContext.currentTime
      );
    }
  };

  // ============ État du test ============
  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.2);
  const [results, setResults] = useState<TestResult[]>([]);
  const [audioReady, setAudioReady] = useState(false);

  // ============ État des fréquences ============
  const [currentFrequency, setCurrentFrequency] = useState(1000);
  const [testPhase, setTestPhase] = useState<'ascending' | 'binary-search'>(
    'ascending'
  );

  // ============ Recherche binaire ============
  const [lowerBound, setLowerBound] = useState(0);
  const [upperBound, setUpperBound] = useState(24000);
  const [precision, setPrecision] = useState(24000);
  const [hearingThreshold, setHearingThreshold] = useState<number | null>(null);

  // ============ HTML pour WebView avec Web Audio API ============
  const audioHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body>
        <script>
          class AudioEngine {
            constructor() {
              this.audioContext = null;
              this.oscillator = null;
              this.gainNode = null;
            }

            async init() {
              if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
              }
              if (this.audioContext.state === 'suspended') {
                try {
                  await this.audioContext.resume();
                } catch (error) {
                  console.warn('AudioContext resume failed', error);
                }
              }
            }

            playTone(frequency, volume) {
              if (!this.audioContext) {
                console.error('AudioContext not initialized');
                return;
              }

              // Stopper le son précédent si existe
              this.stopTone();

              this.oscillator = this.audioContext.createOscillator();
              this.gainNode = this.audioContext.createGain();

              this.oscillator.type = 'sine';
              this.oscillator.frequency.setValueAtTime(
                frequency, 
                this.audioContext.currentTime
              );
              
              this.gainNode.gain.setValueAtTime(
                volume, 
                this.audioContext.currentTime
              );
              
              this.oscillator.connect(this.gainNode);
              this.gainNode.connect(this.audioContext.destination);
              
              this.oscillator.start();
              
              // Auto-stop après 10 secondes (sécurité)
              this.oscillator.stop(this.audioContext.currentTime + 10);
            }

            stopTone() {
              if (this.oscillator) {
                try {
                  this.oscillator.stop();
                } catch (e) {
                  // Déjà stoppé
                }
                this.oscillator = null;
              }
            }

            setVolume(volume) {
              if (this.gainNode) {
                this.gainNode.gain.setValueAtTime(
                  volume,
                  this.audioContext.currentTime
                );
              }
            }
          }

          // Créer l'instance globale
          const audioEngine = new AudioEngine();

          function postAudioReady() {
            if (
              window.ReactNativeWebView &&
              typeof window.ReactNativeWebView.postMessage === 'function'
            ) {
              window.ReactNativeWebView.postMessage(
                JSON.stringify({ type: 'audio_ready' })
              );
            }
          }

          // Exposer les fonctions
          window.initAudio = async () => {
            try {
              await audioEngine.init();
            } catch (error) {
              console.warn('Audio init failed', error);
            }
            postAudioReady();
          };

          window.playTone = (frequency, volume) => {
            audioEngine.playTone(frequency, volume);
          };

          window.stopTone = () => {
            audioEngine.stopTone();
          };

          window.setVolume = (volume) => {
            audioEngine.setVolume(volume);
          };

          window.onerror = (message, source, lineno, colno, error) => {
            postAudioReady();
          };

          // Auto-init au chargement
          window.onload = () => {
            window.initAudio().catch((error) => {
              console.warn('Audio init failed on load', error);
              postAudioReady();
            });
          };
        </script>
      </body>
    </html>
  `;

  // ============ Gérer les messages de la WebView ============
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'audio_ready') {
        setAudioReady(true);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  const handleWebViewLoadEnd = () => {
    if (!audioReady) {
      setAudioReady(true);
    }
  };

  const hiddenWebView = isWeb ? null : (
    <WebView
      ref={webViewRef}
      source={{ html: audioHTML }}
      style={{ height: 0, width: 0 }}
      originWhitelist={["*"]}
      javaScriptEnabled
      onMessage={handleWebViewMessage}
      onLoadEnd={handleWebViewLoadEnd}
      onError={(event) => {
        console.error('WebView error', event.nativeEvent);
      }}
    />
  );

  // ============ Démarrer le test ============
  const startTest = () => {
    if (!audioReady) {
      Alert.alert('Audio non prêt', 'Veuillez patienter quelques secondes...');
      return;
    }

    try {
      setTestStarted(true);
      setTestCompleted(false);
      setResults([]);
      setCurrentFrequency(1000);
      setTestPhase('ascending');
      setLowerBound(0);
      setUpperBound(24000);
      setPrecision(24000);
      setHearingThreshold(null);
      setIsPlaying(false);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de démarrer le test');
    }
  };

  // ============ Jouer la fréquence ============
  const playFrequency = async () => {
    if (!audioReady) return;

    if (isWeb) {
      await playWebTone(currentFrequency, volume);
    } else {
      webViewRef.current?.injectJavaScript(`
        (async function() {
          if (window.initAudio) {
            try {
              await window.initAudio();
            } catch (e) {
              console.warn('Audio init failed before play', e);
            }
          }
          window.playTone(${currentFrequency}, ${volume});
        })();
        true;
      `);
    }

    setIsPlaying(true);
  };

  // ============ Arrêter le son ============
  const stopFrequency = () => {
    if (isWeb) {
      stopWebTone();
    } else {
      webViewRef.current?.injectJavaScript(`
        window.stopTone();
        true;
      `);
    }
    setIsPlaying(false);
  };

  // ============ Mettre à jour le volume ============
  const updateVolume = (newVolume: number) => {
    setVolume(newVolume);
    if (isPlaying) {
      if (isWeb) {
        setWebToneVolume(newVolume);
      } else {
        webViewRef.current?.injectJavaScript(`
          window.setVolume(${newVolume});
          true;
        `);
      }
    }
  };

  // ============ L'utilisateur a ENTENDU ============
  const handleHeard = () => {
    stopFrequency();
    
    const newResult: TestResult = {
      frequency: currentFrequency,
      heard: true,
      timestamp: Date.now(),
    };
    const newResults = [...results, newResult];
    setResults(newResults);

    const newLowerBound = Math.max(lowerBound, currentFrequency);
    const newPrecision = upperBound - newLowerBound;

    if (newPrecision < 200) {
      const threshold = (newLowerBound + upperBound) / 2;
      setHearingThreshold(threshold);
      setTestCompleted(true);
      stopFrequency();
      return;
    }

    let nextFrequency: number;

    if (testPhase === 'ascending') {
      if (currentFrequency < 8000) {
        nextFrequency = currentFrequency * 2;
      } else {
        nextFrequency = currentFrequency + 2000;
      }

      if (nextFrequency > 24000) {
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

  // ============ L'utilisateur N'A PAS ENTENDU ============
  const handleNotHeard = () => {
    stopFrequency();
    
    const newResult: TestResult = {
      frequency: currentFrequency,
      heard: false,
      timestamp: Date.now(),
    };
    const newResults = [...results, newResult];
    setResults(newResults);

    const newUpperBound = Math.min(upperBound, currentFrequency);
    const newPrecision = newUpperBound - lowerBound;

    if (newPrecision < 200) {
      const threshold = (lowerBound + newUpperBound) / 2;
      setHearingThreshold(threshold);
      setTestCompleted(true);
      stopFrequency();
      return;
    }

    const nextFrequency = (lowerBound + newUpperBound) / 2;

    setCurrentFrequency(Math.round(nextFrequency));
    setUpperBound(newUpperBound);
    setPrecision(newPrecision);
    setTestPhase('binary-search');
  };

  // ============ Arrêter le test ============
  const cancelTest = () => {
    stopFrequency();
    setTestStarted(false);
    setResults([]);
  };

  // ============ ÉCRAN RÉSULTATS ============
  if (testCompleted && hearingThreshold !== null) {
    const summary = getTestSummary(hearingThreshold);

    return (
      <SafeAreaView style={styles.safeArea}>
        {/* WebView caché (toujours présent) */}
        {hiddenWebView}

        <View style={styles.header}>
          <Text style={styles.headerTitle}>HearSafe</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Score */}
          <Card style={styles.scoreCard}>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreValue}>
                {Math.round(hearingThreshold)}
              </Text>
              <Text style={styles.scoreUnit}>Hz</Text>
            </View>
          </Card>

          {/* Statistiques */}
          <Card>
            <Text style={styles.sectionTitle}>Résumé du test</Text>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Seuil auditif détecté:</Text>
              <Text style={styles.statValue}>
                {Math.round(hearingThreshold)} Hz
              </Text>
            </View>
          </Card>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title="Refaire le test"
              variant="primary"
              size="lg"
              onPress={startTest}
              style={{ marginBottom: 12 }}
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ============ ÉCRAN TEST EN COURS ============
  if (testStarted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {/* WebView caché (toujours présent) */}
        {hiddenWebView}

        <View style={styles.header}>
          <TouchableOpacity onPress={cancelTest}>
            <Text style={styles.backButton}>✕ Annuler</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>HearSafe</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Infos phase */}
          <Card>
            <View style={styles.phaseInfo}>
              <Text style={styles.phaseLabel}>
                Phase:{' '}
                <Text style={styles.phaseValue}>
                  {testPhase === 'ascending'
                    ? 'Montante (×2 jusqu\'à 8kHz, +2kHz après)'
                    : 'Recherche Binaire'}
                </Text>
              </Text>
              <Text style={styles.precisionLabel}>
                Précision: ±{Math.round(precision / 2)} Hz
              </Text>
            </View>
          </Card>

          {/* Fréquence actuelle */}
          <Card style={styles.audioCard}>
            <View style={styles.frequencyDisplay}>
              <Text style={styles.frequencyLabel}>Fréquence actuelle</Text>
              <Text style={styles.frequencyValue}>
                {currentFrequency.toLocaleString()} Hz
              </Text>
            </View>

            {/* Bouton Play/Stop */}
            <TouchableOpacity
              style={[
                styles.playButton,
                isPlaying && styles.playButtonPlaying,
              ]}
              onPress={isPlaying ? stopFrequency : playFrequency}
            >
              <Text style={styles.playIcon}>
                {isPlaying ? '⏸' : '▶'}
              </Text>
              <Text style={styles.playText}>
                {isPlaying ? 'En cours...' : 'Jouer'}
              </Text>
            </TouchableOpacity>
          </Card>

          {/* Volume Control */}
          <Card>
            <Text style={styles.volumeLabel}>Volume: {Math.round(volume * 100)}%</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              value={volume}
              onValueChange={updateVolume}
              minimumTrackTintColor={Colors.primary}
              maximumTrackTintColor={Colors.border}
              step={0.05}
            />
            <Text style={styles.volumeHint}>
              Modifier le volume
            </Text>
          </Card>

          {/* Response Buttons */}
          <View style={styles.responseButtons}>
            <Button
              title="J'entends"
              variant="primary"
              size="lg"
              onPress={handleHeard}
              //disabled={!isPlaying}
            />
            <Button
              title="Je n'entends pas"
              variant="secondary"
              size="lg"
              onPress={handleNotHeard}
              style={{ marginTop: 12 }}
              //disabled={!isPlaying}
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ============ ÉCRAN ACCUEIL ============
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* WebView caché (toujours présent) */}
      {hiddenWebView}

      <View style={styles.header}>
        <Text style={styles.headerTitle}>HearSafe</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Icon */}
        <View style={styles.centerContainer}>
          <Text style={styles.logoIcon}>🎧</Text>
        </View>

        {/* Title */}
        <Card style={styles.titleCard}>
          <Text style={styles.titleText}>Test Auditif </Text>
        </Card>

        {/* Spécifications */}
        <Card>
          <Text style={styles.specTitle}>Spécifications</Text>
          <View style={styles.specGrid}>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Plage de fréquences</Text>
              <Text style={styles.specValue}>250 Hz - 24000 Hz</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Précision finale</Text>
              <Text style={styles.specValue}>±200 Hz</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Type de ton</Text>
              <Text style={styles.specValue}>Sinusoïdal </Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Méthode</Text>
              <Text style={styles.specValue}>Recherche Binaire</Text>
            </View>
          </View>
        </Card>

        {/* Start Button */}
        <Button
          title={audioReady ? "Démarrer le test" : "Chargement de l'audio..."}
          variant="primary"
          size="lg"
          onPress={startTest}
          style={styles.startButton}
          disabled={!audioReady}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============ UTILITAIRES ============

function getFrequencyRange(frequency: number): string {
  if (frequency < 500) return '🔉 Très basses fréquences';
  if (frequency < 2000) return '🔊 Basses-médiums';
  if (frequency < 5000) return '🔊 Médiums';
  if (frequency < 10000) return '🔊 Hautes fréquences';
  return '🔊 Très hautes fréquences';
}

function getTestSummary(threshold: number): {
  status: string;
  interpretation: string;
} {
  if (threshold <= 8000) {
    return {
      status: '✓ Excellent',
      interpretation:
        'Votre audition est excellente. Vous pouvez détecter des fréquences élevées typiques de jeunes oreilles.',
    };
  } else if (threshold <= 12000) {
    return {
      status: '✓ Bon',
      interpretation:
        'Votre audition est bonne. Seuil auditif normal pour un adulte.',
    };
  } else if (threshold <= 16000) {
    return {
      status: '⚠️ Acceptable',
      interpretation:
        'Perte auditive légère détectée. Vous avez une difficulté à entendre les hautes fréquences.',
    };
  } else {
    return {
      status: '⚠️ Perte détectée',
      interpretation:
        'Perte auditive importante détectée. Consultez un audiologiste pour un diagnostic complet.',
    };
  }
}

// ============ STYLES ============
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  scrollView: {
    padding: 16,
  },
  centerContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  logoIcon: {
    fontSize: 80,
  },
  titleCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: Colors.text,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  specTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: Colors.text,
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  specItem: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  specLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  specValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
  },
  warningCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 0,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 20,
  },
  startButton: {
    marginTop: 16,
  },
  phaseInfo: {
    alignItems: 'center',
  },
  phaseLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  phaseValue: {
    fontWeight: '700',
    color: Colors.primary,
  },
  precisionLabel: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  audioCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  frequencyDisplay: {
    alignItems: 'center',
    marginBottom: 20,
  },
  frequencyLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  frequencyValue: {
    fontSize: 42,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  frequencyDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  playButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonPlaying: {
    opacity: 0.7,
  },
  playIcon: {
    fontSize: 40,
    color: '#FFFFFF',
  },
  playText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  volumeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 8,
  },
  volumeHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  instructionCard: {
    backgroundColor: '#E0F2FE',
    borderWidth: 0,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0369A1',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 13,
    lineHeight: 21,
    color: '#0369A1',
  },
  responseButtons: {
    marginTop: 16,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  progressDetail: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  scoreCard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  scoreCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scoreUnit: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  statusLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: Colors.text,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  interpretationCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 0,
  },
  interpretationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#15803D',
    marginBottom: 8,
  },
  interpretationText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#15803D',
    marginBottom: 12,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#B91C1C',
    fontStyle: 'italic',
  },
  actions: {
    marginTop: 16,
  },
});