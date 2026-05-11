import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/colors';
import { TEST_FREQUENCIES, formatFrequency } from '../constants/hearing-test.constants';
import type { Ear, FrequencyThreshold, TestMode } from '../types/hearing-test.types';

interface TestingViewProps {
  testMode:         TestMode;
  currentEar:       Ear;
  freqIndex:        number;
  totalFrequencies: number;
  currentFrequency: number;
  isPlaying:        boolean;
  isSilentTrial:    boolean;
  frequencyResults: FrequencyThreshold[];
  onReplay:         () => void;
  onResponse:       (heard: boolean) => void;
}

const SORTED_FREQUENCIES = [...TEST_FREQUENCIES].sort((a, b) => a - b);

// Individual animated wave bar
const WaveBar: React.FC<{ isPlaying: boolean; height: number; delay: number }> = ({
  isPlaying, height, delay,
}) => {
  const anim = useRef(new Animated.Value(3)).current;

  useEffect(() => {
    if (isPlaying) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: height, duration: 380 + delay * 0.4, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
          Animated.timing(anim, { toValue: 3,      duration: 380 + delay * 0.4, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        ]),
        { iterations: -1 }
      );
      // stagger start
      const t = setTimeout(() => loop.start(), delay);
      return () => { clearTimeout(t); loop.stop(); };
    } else {
      Animated.timing(anim, { toValue: 3, duration: 200, useNativeDriver: false }).start();
    }
  }, [isPlaying]);

  return (
    <Animated.View style={[styles.waveBar, { height: anim }]} />
  );
};

const WAVE_HEIGHTS = [10, 22, 16, 32, 20, 38, 26, 34, 18, 28, 14, 30, 20, 36, 12];

export const TestingView: React.FC<TestingViewProps> = ({
  testMode,
  currentEar,
  freqIndex,
  totalFrequencies,
  currentFrequency,
  isPlaying,
  isSilentTrial: _isSilentTrial,
  frequencyResults,
  onReplay,
  onResponse,
}) => {
  const resultByFreq = new Map(frequencyResults.map(r => [r.frequency, r]));

  // Scale anim for the heard button press feedback
  const heardScale    = useRef(new Animated.Value(1)).current;
  const notHeardScale = useRef(new Animated.Value(1)).current;

  const animatePress = (anim: Animated.Value, callback: () => void) => {
    Animated.sequence([
      Animated.timing(anim, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1,    duration: 100, useNativeDriver: true }),
    ]).start(() => callback());
  };

  const handleHeard = () => animatePress(heardScale,    () => onResponse(true));
  const handleMiss  = () => animatePress(notHeardScale, () => onResponse(false));

  return (
    <>
      {/* Frequency progress dots */}
      <Card style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <View style={[
            styles.modeBadge,
            testMode === 'speaker' && styles.modeBadgeMono,
          ]}>
            {testMode === 'headset' ? (
              <>
                <Ionicons
                  name={currentEar === 'left' ? 'arrow-back' : 'arrow-forward'}
                  size={12}
                  color={Colors.primary}
                />
                <Text style={styles.modeBadgeText}>
                  {currentEar === 'left' ? 'OREILLE GAUCHE' : 'OREILLE DROITE'}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="volume-medium" size={12} color={Colors.textSecondary} />
                <Text style={[styles.modeBadgeText, { color: Colors.textSecondary }]}>
                  LES DEUX OREILLES
                </Text>
              </>
            )}
          </View>
          <Text style={styles.progressCount}>
            {frequencyResults.length}<Text style={styles.progressCountTotal}> / {totalFrequencies}</Text>
          </Text>
        </View>

        <View style={styles.dotsRow}>
          {SORTED_FREQUENCIES.map(freq => {
            const isDone    = resultByFreq.has(freq);
            const isCurrent = TEST_FREQUENCIES[freqIndex] === freq && !isDone;
            return (
              <View key={freq} style={styles.dotWrap}>
                <View style={[
                  styles.dot,
                  isDone    && styles.dotDone,
                  isCurrent && styles.dotCurrent,
                ]}>
                  {isDone    && <Ionicons name="checkmark" size={11} color="#fff" />}
                  {isCurrent && <View style={styles.dotPulse} />}
                </View>
                <Text style={styles.dotLabel}>{formatFrequency(freq)}</Text>
              </View>
            );
          })}
        </View>
      </Card>

      {/* Audio visualizer card */}
      <Card style={styles.audioCard} elevated>
        <View style={styles.audioTop}>
          <View style={styles.freqMeta}>
            <Text style={styles.freqLabel}>FRÉQUENCE</Text>
            <Text style={styles.freqValue}>{currentFrequency.toLocaleString()}</Text>
            <Text style={styles.freqUnit}>Hz</Text>
          </View>

          <Pressable onPress={onReplay} style={styles.replayBtn} hitSlop={8}>
            <Ionicons name="refresh" size={15} color={Colors.primary} />
            <Text style={styles.replayText}>Rejouer</Text>
          </Pressable>
        </View>

        {/* Animated wave */}
        <View style={styles.waveContainer}>
          {WAVE_HEIGHTS.map((h, i) => (
            <WaveBar key={i} isPlaying={isPlaying} height={h} delay={i * 55} />
          ))}
        </View>

        <Text style={[styles.statusText, isPlaying && styles.statusTextActive]}>
          {isPlaying ? 'Son en cours…' : 'Attendez le son ou tapez Rejouer'}
        </Text>
      </Card>

      {/* Response section */}
      <View style={styles.responseSection}>
        <Text style={styles.responseQuestion}>Entendez-vous le son ?</Text>

        <Animated.View style={{ transform: [{ scale: heardScale }] }}>
          <Pressable onPress={handleHeard} style={styles.heardBtnWrap}>
            <LinearGradient
              colors={['#0D8FA5', '#0B7285', '#09616F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heardBtn}
            >
              <Ionicons name="checkmark-circle" size={30} color="#fff" />
              <Text style={styles.heardBtnText}>J'entends</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Animated.View style={{ transform: [{ scale: notHeardScale }] }}>
          <Pressable onPress={handleMiss} style={styles.notHeardBtn}>
            <Ionicons name="close-circle-outline" size={20} color={Colors.textSecondary} />
            <Text style={styles.notHeardBtnText}>Je n'entends pas</Text>
          </Pressable>
        </Animated.View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  // Progress card
  progressCard: { paddingVertical: 16, gap: 14 },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  modeBadgeMono: { backgroundColor: Colors.surfaceSecondary },
  modeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.6,
  },
  progressCount: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  progressCountTotal: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textTertiary,
  },
  dotsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  dotWrap: { alignItems: 'center', flex: 1, gap: 5 },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotDone:    { backgroundColor: Colors.success },
  dotCurrent: { backgroundColor: Colors.primary },
  dotPulse: {
    width: 9, height: 9,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  dotLabel: {
    fontSize: 9,
    color: Colors.textTertiary,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Audio card
  audioCard: {
    alignItems: 'center',
    paddingVertical: 26,
    paddingHorizontal: 20,
    gap: 6,
  },
  audioTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
  },
  freqMeta: { gap: 0 },
  freqLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 1,
  },
  freqValue: {
    fontSize: 52,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -2,
    lineHeight: 56,
  },
  freqUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: -4,
  },
  replayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    marginTop: 4,
  },
  replayText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  // Wave
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 42,
    marginVertical: 8,
  },
  waveBar: {
    width: 4,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    opacity: 0.75,
  },
  statusText: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  statusTextActive: { color: Colors.primary, fontWeight: '600' },

  // Response
  responseSection: {
    gap: 10,
    marginBottom: 4,
  },
  responseQuestion: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  heardBtnWrap: {
    borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14 },
      android: { elevation: 6 },
    }),
  },
  heardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 22,
    paddingHorizontal: 24,
  },
  heardBtnText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  notHeardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notHeardBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
