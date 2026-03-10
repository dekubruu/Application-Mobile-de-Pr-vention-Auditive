// app/test.tsx - VERSION MODIFIÉE
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Colors } from '../../constants/colors';
import { AudioGeneratorService } from '../../hooks/audioGeneratorService';

/**
 * MODIFICATIONS APPLIQUÉES:
 * 
 * 1. ✅ Son joué SEULEMENT quand on clique "Jouer", pas au démarrage
 * 2. ✅ Progression: ×2 jusqu'à 8kHz, puis +2kHz jusqu'à 24kHz
 * 3. ✅ Boutons "J'entends/Je n'entends pas" cliquables PENDANT que le son joue
 */

interface TestResult {
  frequency: number;
  heard: boolean;
  timestamp: number;
}

export default function TestScreen() {
  const router = useRouter();

  // ============ État du test ============
  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.2); // 0-1
  const [results, setResults] = useState<TestResult[]>([]);

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

  // ============ Initialiser AudioContext ============
  useEffect(() => {
    try {
      AudioGeneratorService.initAudioContext();
    } catch (error) {
      Alert.alert(
        'Erreur Audio',
        'Web Audio API non supportée. Utilisez un navigateur moderne.'
      );
    }
  }, []);

  // ============ MODIFICATION 1: Démarrer le test SANS jouer de son ============
  const startTest = () => {
    try {
      // NE PAS jouer de son au démarrage
      // Le son ne sera joué que quand l'utilisateur clique sur "Jouer"

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
  const playFrequency = () => {
    AudioGeneratorService.playFrequency(currentFrequency, volume);
    setIsPlaying(true);
  };

  // ============ Arrêter le son ============
  const stopFrequency = () => {
    AudioGeneratorService.stopFrequency();
    setIsPlaying(false);
  };

  // ============ MODIFICATION 3: L'utilisateur a ENTENDU (PEUT CLIQUER PENDANT SON) ============
  const handleHeard = () => {
    // ✅ Ne pas arrêter le son automatiquement
    // L'utilisateur peut appuyer pendant que le son joue
    stopFrequency()
    // Enregistrer le résultat
    const newResult: TestResult = {
      frequency: currentFrequency,
      heard: true,
      timestamp: Date.now(),
    };
    const newResults = [...results, newResult];
    setResults(newResults);

    // Mettre à jour lowerBound
    const newLowerBound = Math.max(lowerBound, currentFrequency);

    // Calculer la nouvelle précision
    const newPrecision = upperBound - newLowerBound;

    // ✅ VÉRIFIER SI TEST TERMINÉ
    if (newPrecision < 200) {
      const threshold = (newLowerBound + upperBound) / 2;
      setHearingThreshold(threshold);
      setTestCompleted(true);
      stopFrequency(); // Arrêter le son quand test terminé
      return;
    }

    // ============ MODIFICATION 2: Nouvelle progression ============
    // ×2 jusqu'à 8kHz, puis +2kHz après
    let nextFrequency: number;

    if (testPhase === 'ascending') {
      if (currentFrequency < 8000) {
        // Avant 8kHz: doubler
        nextFrequency = currentFrequency * 2;
      } else {
        // À partir de 8kHz: ajouter 2kHz
        nextFrequency = currentFrequency + 2000;
      }

      // Si dépasse 24000, passer à binary search
      if (nextFrequency > 24000) {
        nextFrequency = (newLowerBound + upperBound) / 2;
        setTestPhase('binary-search');
      }
    } else {
      // Phase binary search
      nextFrequency = (newLowerBound + upperBound) / 2;
    }

    // Mettre à jour l'état
    setCurrentFrequency(Math.round(nextFrequency));
    setLowerBound(newLowerBound);
    setPrecision(newPrecision);
  };

  // ============ L'utilisateur N'A PAS ENTENDU ============
  const handleNotHeard = () => {
    // ✅ Ne pas arrêter le son automatiquement
    stopFrequency()
    
    // Enregistrer le résultat
    const newResult: TestResult = {
      frequency: currentFrequency,
      heard: false,
      timestamp: Date.now(),
    };
    const newResults = [...results, newResult];
    setResults(newResults);

    // Mettre à jour upperBound
    const newUpperBound = Math.min(upperBound, currentFrequency);

    // Calculer la nouvelle précision
    const newPrecision = newUpperBound - lowerBound;

    // ✅ VÉRIFIER SI TEST TERMINÉ
    if (newPrecision < 200) {
      const threshold = (lowerBound + newUpperBound) / 2;
      setHearingThreshold(threshold);
      setTestCompleted(true);
      stopFrequency();
      return;
    }

    // Passer à binary search et calculer milieu
    const nextFrequency = (lowerBound + newUpperBound) / 2;

    // Mettre à jour l'état
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

          {/* Interprétation 
          <Card style={styles.interpretationCard}>
            <Text style={styles.interpretationTitle}>📊 Interprétation</Text>
            <Text style={styles.interpretationText}>{summary.interpretation}</Text>
            <Text style={styles.disclaimerText}>
              ⚠️ Cet outil est un dépistage préliminaire. Consultez un audiologiste
              pour une évaluation complète.
            </Text>
          </Card>
          */}
          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title="Refaire le test"
              variant="primary"
              size="lg"
              onPress={startTest}
              style={{ marginBottom: 12 }}
            />
            {/*
            <Button
              title="Sauvegarder et continuer"
              variant="secondary"
              size="lg"
              onPress={() => {
                router.push('../results');
              }}
            />
            */}
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
        <View style={styles.header}>
          <TouchableOpacity onPress={cancelTest}>
            <Text style={styles.backButton}>✕ Annuler</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>HearSafe</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Infos phase 
          <Card>
            <View style={styles.phaseInfo}>
              <Text style={styles.phaseLabel}>
                Phase:{' '}
                <Text style={styles.phaseValue}>
                  {testPhase === 'ascending'
                    ? 'Montante (Doubling jusqu\'à 8kHz, +2kHz après)'
                    : 'Recherche Binaire'}
                </Text>
              </Text>
              <Text style={styles.precisionLabel}>
                Précision: ±{Math.round(precision / 2)} Hz
              </Text>
            </View>
          </Card>
          */}

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
              onValueChange={setVolume}
              minimumTrackTintColor={Colors.primary}
              maximumTrackTintColor={Colors.border}
              step={0.05}
            />
            <Text style={styles.volumeHint}>
              Modifier le volume
            </Text>
          </Card>

          {/* Instructions 
          <Card style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>📋 Instructions</Text>
            <Text style={styles.instructionText}>
              1. Cliquez sur "Jouer" pour entendre le son{'\n'}
              2. Indiquez si vous l'entendez pendant que le son joue{'\n'}
              3. Le test s'ajustera automatiquement{'\n'}
              4. Continuez jusqu'à la fin
            </Text>
          </Card>
          */}

          {/* Response Buttons - ✅ MODIFIÉS: Ne pas désactiver pendant le son */}
          <View style={styles.responseButtons}>
            <Button
              title="J'entends"
              variant="primary"
              size="lg"
              onPress={handleHeard}
               disabled={!isPlaying}
            />
            <Button
              title="Je n'entends pas"
              variant="secondary"
              size="lg"
              onPress={handleNotHeard}
              style={{ marginTop: 12 }}
               disabled={!isPlaying}
            />
          </View>

          {/* Progression 
          <Card>
            <Text style={styles.progressLabel}>
              Tests effectués: {results.length}
            </Text>
            <Text style={styles.progressDetail}>
              Plage restante: {Math.round(lowerBound)} - {Math.round(upperBound)} Hz
            </Text>
          </Card>
          */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ============ ÉCRAN ACCUEIL ============
  return (
    <SafeAreaView style={styles.safeArea}>
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

        {/* Description 
        <Card>
          <Text style={styles.descriptionTitle}>Comment ça fonctionne?</Text>
          <Text style={styles.descriptionText}>
            Ce test utilise une{' '}
            <Text style={{ fontWeight: '700' }}>recherche binaire</Text> pour
            trouver votre seuil auditif exact:{'\n\n'}
            • Commence à 1000 Hz{'\n'}
            • Doubling jusqu'à 8kHz, puis +2kHz{'\n'}
            • Affine la plage jusqu'à ±100 Hz{'\n'}
            {'\n'}
            ✓ Durée: ~5-10 minutes{'\n'}
            ✓ Casque recommandé{'\n'}
            ✓ Environnement calme requis
          </Text>
        </Card>
        */}

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

        {/* Warning 
        <Card style={styles.warningCard}>
          <Text style={styles.warningTitle}>⚠️ Important</Text>
          <Text style={styles.warningText}>
            Cet outil est un{' '}
            <Text style={{ fontWeight: '700' }}>dépistage préliminaire</Text>,
            pas un diagnostic médical. Consultez un audiologiste pour une
            évaluation complète et professionnelle.
          </Text>
        </Card>
        */}

        {/* Start Button */}
        <Button
          title="Démarrer le test"
          variant="primary"
          size="lg"
          onPress={startTest}
          style={styles.startButton}
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