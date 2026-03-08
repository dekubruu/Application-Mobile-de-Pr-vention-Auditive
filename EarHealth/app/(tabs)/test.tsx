// app/test.tsx
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Colors } from '../../constants/colors';

export default function TestScreen() {
  const router = useRouter();
  const [testProgress, setTestProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(60);

  const frequencies = ['250 Hz', '500 Hz', '1 kHz', '2 kHz', '4 kHz', '8 kHz'];
  const currentFreq = frequencies[testProgress % frequencies.length];
  const currentStep = Math.floor(testProgress / frequencies.length) + 1;

  const handleHeard = () => {
    if (testProgress < 17) {
      setTestProgress(testProgress + 1);
    } else {
      router.push('../results');
    }
  };

  const handleNotHeard = () => {
    if (testProgress < 17) {
      setTestProgress(testProgress + 1);
    } else {
      router.push('../results');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>

        <Text style={styles.headerTitle}>HearSafe</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>



        {/* Audio Control */}
        <Card style={styles.audioCard}>
          <View style={styles.frequencyDisplay}>
            <Text style={styles.frequencyLabel}>Fréquence actuelle</Text>
            <Text style={styles.frequencyValue}>{currentFreq}</Text>
          </View>

          <TouchableOpacity
            style={[styles.playButton, isPlaying && styles.playButtonPlaying]}
            onPress={() => setIsPlaying(!isPlaying)}
          >
            <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
            <Text style={styles.playText}>{isPlaying ? 'En cours...' : 'Jouer'}</Text>
          </TouchableOpacity>

        </Card>

        {/* Response Buttons */}
        <View style={styles.responseButtons}>
          <Button
            title="J'entends le son"
            variant="primary"
            size="lg"
            onPress={handleHeard}
          />
          <Button
            title="Je n'entends pas"
            variant="secondary"
            size="lg"
            onPress={handleNotHeard}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

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
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
  },
  scrollView: {
    padding: 16,
  },
  progressSection: {
    alignItems: 'center',
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
  progressStep: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStepActive: {
    backgroundColor: Colors.primary,
    transform: [{ scale: 1.1 }],
  },
  progressStepText: {
    fontWeight: '700',
    color: Colors.textSecondary,
    fontSize: 16,
  },
  progressStepTextActive: {
    color: '#FFFFFF',
  },
  progressText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.textSecondary,
  },
  audioCard: {
    alignItems: 'center',
  },
  frequencyDisplay: {
    alignItems: 'center',
    marginBottom: 20,
  },
  frequencyLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  frequencyValue: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.primary,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  playButtonPlaying: {
    opacity: 0.8,
  },
  playIcon: {
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  playText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  volumeControl: {
    width: '100%',
  },
  volumeLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  responseButtons: {
    gap: 12,
    marginBottom: 16,
  },
  hintCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 0,
  },
  hintText: {
    fontSize: 13,
    color: '#92400E',
    textAlign: 'center',
  },
});
