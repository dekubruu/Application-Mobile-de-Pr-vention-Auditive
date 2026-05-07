import Slider from '@react-native-community/slider';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/colors';
import type { TestPhase } from '../types/hearing-test.types';

interface TestingViewProps {
  currentFrequency: number;
  isPlaying: boolean;
  volume: number;
  testPhase: TestPhase;
  precision: number;
  onPlay: () => void;
  onStop: () => void;
  onVolumeChange: (volume: number) => void;
  onHeard: () => void;
  onNotHeard: () => void;
}

export const TestingView: React.FC<TestingViewProps> = ({
  currentFrequency,
  isPlaying,
  volume,
  testPhase,
  precision,
  onPlay,
  onStop,
  onVolumeChange,
  onHeard,
  onNotHeard,
}) => (
  <>
    <Card>
      <View style={styles.phaseInfo}>
        <Text style={styles.phaseLabel}>
          Phase:{' '}
          <Text style={styles.phaseValue}>
            {testPhase === 'ascending'
              ? "Montante (×2 jusqu'à 8kHz, +2kHz après)"
              : 'Recherche Binaire'}
          </Text>
        </Text>
        <Text style={styles.precisionLabel}>
          Précision: ±{Math.round(precision / 2)} Hz
        </Text>
      </View>
    </Card>

    <Card style={styles.audioCard}>
      <View style={styles.frequencyDisplay}>
        <Text style={styles.frequencyLabel}>Fréquence actuelle</Text>
        <Text style={styles.frequencyValue}>
          {currentFrequency.toLocaleString()} Hz
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.playButton, isPlaying && styles.playButtonPlaying]}
        onPress={isPlaying ? onStop : onPlay}
      >
        <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
        <Text style={styles.playText}>{isPlaying ? 'En cours...' : 'Jouer'}</Text>
      </TouchableOpacity>
    </Card>

    <Card>
      <Text style={styles.volumeLabel}>Volume: {Math.round(volume * 100)}%</Text>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={1}
        value={volume}
        onValueChange={onVolumeChange}
        minimumTrackTintColor={Colors.primary}
        maximumTrackTintColor={Colors.border}
        step={0.05}
      />
      <Text style={styles.volumeHint}>Modifier le volume</Text>
    </Card>

    <View style={styles.responseButtons}>
      <Button
        title="J'entends"
        variant="primary"
        size="lg"
        onPress={onHeard}
      />
      <Button
        title="Je n'entends pas"
        variant="secondary"
        size="lg"
        onPress={onNotHeard}
        style={{ marginTop: 12 }}
      />
    </View>
  </>
);

const styles = StyleSheet.create({
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
  responseButtons: {
    marginTop: 16,
  },
});
