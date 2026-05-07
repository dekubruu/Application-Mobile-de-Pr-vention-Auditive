import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
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
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isPlaying) {
      pulseRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      );
      pulseRef.current.start();
    } else {
      pulseRef.current?.stop();
      Animated.spring(pulseAnim, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
    }
    return () => { pulseRef.current?.stop(); };
  }, [isPlaying]);

  return (
    <>
      <Card style={styles.phaseCard}>
        <View style={styles.phaseRow}>
          <View style={styles.phaseBadge}>
            <Text style={styles.phaseBadgeText}>
              {testPhase === 'ascending' ? 'Phase Montante' : 'Recherche Binaire'}
            </Text>
          </View>
          <Text style={styles.precisionText}>±{Math.round(precision / 2)} Hz</Text>
        </View>
      </Card>

      <Card style={styles.audioCard} elevated>
        <Text style={styles.freqLabel}>Fréquence actuelle</Text>
        <Text style={styles.freqValue}>{currentFrequency.toLocaleString()} Hz</Text>

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Pressable
            style={[styles.playBtn, isPlaying && styles.playBtnActive]}
            onPress={isPlaying ? onStop : onPlay}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={38}
              color="#FFFFFF"
              style={isPlaying ? undefined : styles.playIconOffset}
            />
          </Pressable>
        </Animated.View>

        <Text style={styles.playHint}>{isPlaying ? 'Appuyez pour arrêter' : 'Appuyez pour jouer'}</Text>
      </Card>

      <Card>
        <View style={styles.volumeRow}>
          <Text style={styles.volumeLabel}>Volume</Text>
          <Text style={styles.volumeValue}>{Math.round(volume * 100)}%</Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={1}
          value={volume}
          onValueChange={onVolumeChange}
          minimumTrackTintColor={Colors.primary}
          maximumTrackTintColor={Colors.borderLight}
          thumbTintColor={Colors.primary}
          step={0.05}
        />
      </Card>

      <View style={styles.actions}>
        <Button title="J'entends" variant="primary" size="lg" onPress={onHeard} style={styles.btnHeard} />
        <Button title="Je n'entends pas" variant="secondary" size="lg" onPress={onNotHeard} />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  phaseCard: {
    paddingVertical: 12,
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phaseBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  phaseBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 0.2,
  },
  precisionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  audioCard: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  freqLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  freqValue: {
    fontSize: 44,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -1,
    marginBottom: 28,
  },
  playBtn: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtnActive: {
    backgroundColor: Colors.primaryMid,
  },
  playIconOffset: {
    marginLeft: 4,
  },
  playHint: {
    marginTop: 14,
    fontSize: 13,
    color: Colors.textTertiary,
    letterSpacing: 0.2,
  },
  volumeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  volumeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  volumeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
  btnHeard: {},
});
