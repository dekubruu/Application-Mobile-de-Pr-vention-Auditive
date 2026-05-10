import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
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

// Frequencies sorted by value for the progress bar
const SORTED_FREQUENCIES = [...TEST_FREQUENCIES].sort((a, b) => a - b);

export const TestingView: React.FC<TestingViewProps> = ({
  testMode,
  currentEar,
  freqIndex,
  totalFrequencies,
  currentFrequency,
  isPlaying,
  isSilentTrial: _isSilentTrial, // intentionally unused in UI (blind test)
  frequencyResults,
  onReplay,
  onResponse,
}) => {
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const pulseRef    = useRef<Animated.CompositeAnimation | null>(null);
  const opacityAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    if (isPlaying) {
      pulseRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.07, duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      );
      pulseRef.current.start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacityAnim, { toValue: 1,   duration: 550, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.25, duration: 550, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseRef.current?.stop();
      opacityAnim.stopAnimation();
      Animated.spring(pulseAnim, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
      Animated.timing(opacityAnim, { toValue: 0.25, duration: 200, useNativeDriver: true }).start();
    }
    return () => { pulseRef.current?.stop(); };
  }, [isPlaying]);

  // Map frequency → result for quick lookup
  const resultByFreq = new Map(frequencyResults.map(r => [r.frequency, r]));

  const renderFrequencyProgress = () => (
    <Card style={styles.progressCard}>
      <View style={styles.progressHeader}>
        <View style={styles.modeBadge}>
          {testMode === 'headset' ? (
            <>
              <Ionicons
                name={currentEar === 'left' ? 'arrow-back' : 'arrow-forward'}
                size={13}
                color={Colors.primary}
              />
              <Text style={styles.modeBadgeText}>
                {currentEar === 'left' ? 'OREILLE GAUCHE' : 'OREILLE DROITE'}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="volume-medium" size={13} color={Colors.textSecondary} />
              <Text style={[styles.modeBadgeText, { color: Colors.textSecondary }]}>LES DEUX OREILLES</Text>
            </>
          )}
        </View>
        <Text style={styles.progressLabel}>
          {frequencyResults.length} / {totalFrequencies}
        </Text>
      </View>

      <View style={styles.dotsRow}>
        {SORTED_FREQUENCIES.map((freq, _sortedIdx) => {
          const isDone      = resultByFreq.has(freq);
          const isCurrent   = TEST_FREQUENCIES[freqIndex] === freq && !isDone;
          return (
            <View key={freq} style={styles.dotWrap}>
              <View style={[
                styles.dot,
                isDone    && styles.dotDone,
                isCurrent && styles.dotCurrent,
              ]}>
                {isDone && <Ionicons name="checkmark" size={10} color="#fff" />}
                {isCurrent && <View style={styles.dotPulse} />}
              </View>
              <Text style={styles.dotLabel}>{formatFrequency(freq)}</Text>
            </View>
          );
        })}
      </View>
    </Card>
  );

  return (
    <>
      {renderFrequencyProgress()}

      {/* Active tone card */}
      <Card style={styles.audioCard} elevated>
        <Text style={styles.freqLabel}>Fréquence en cours</Text>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Text style={styles.freqValue}>{currentFrequency.toLocaleString()} Hz</Text>
        </Animated.View>

        <Animated.View style={[styles.waveRow, { opacity: opacityAnim }]}>
          {[10, 20, 8, 26, 12, 22, 8, 16, 24, 10].map((h, i) => (
            <View key={i} style={[styles.waveBar, { height: isPlaying ? h : 4 }]} />
          ))}
        </Animated.View>

        <Text style={styles.statusText}>
          {isPlaying ? 'Son en cours…' : 'En attente de votre réponse'}
        </Text>

        <Pressable style={styles.replayBtn} onPress={onReplay}>
          <Ionicons name="refresh" size={14} color={Colors.primary} />
          <Text style={styles.replayText}>Rejouer</Text>
        </Pressable>
      </Card>

      {/* Response */}
      <Card style={styles.responseCard}>
        <Text style={styles.responseLabel}>Entendez-vous le son ?</Text>
        <View style={styles.btnRow}>
          <Pressable style={[styles.btn, styles.btnYes]} onPress={() => onResponse(true)}>
            <Ionicons name="checkmark" size={22} color="#fff" />
            <Text style={styles.btnYesText}>J'entends</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnNo]} onPress={() => onResponse(false)}>
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
            <Text style={styles.btnNoText}>Je n'entends pas</Text>
          </Pressable>
        </View>
      </Card>
    </>
  );
};

const styles = StyleSheet.create({
  progressCard: { paddingVertical: 16, gap: 12 },
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
    paddingVertical: 4,
  },
  modeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  progressLabel: { fontSize: 13, fontWeight: '600', color: Colors.textTertiary },
  dotsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  dotWrap: { alignItems: 'center', flex: 1 },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  dotDone:    { backgroundColor: Colors.success },
  dotCurrent: { backgroundColor: Colors.primary },
  dotPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  dotLabel: { fontSize: 9, color: Colors.textTertiary, fontWeight: '600', textAlign: 'center' },

  audioCard: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  freqLabel: { fontSize: 13, color: Colors.textSecondary, letterSpacing: 0.3 },
  freqValue: { fontSize: 44, fontWeight: '700', color: Colors.text, letterSpacing: -1 },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 32,
    marginVertical: 4,
  },
  waveBar: { width: 4, borderRadius: 2, backgroundColor: Colors.primary },
  statusText: { fontSize: 13, color: Colors.textTertiary },
  replayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    marginTop: 4,
  },
  replayText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  responseCard: { paddingVertical: 20 },
  responseLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  btnRow: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  btnYes:     { backgroundColor: Colors.primary },
  btnNo:      { backgroundColor: Colors.surfaceSecondary, borderWidth: 1.5, borderColor: Colors.border },
  btnYesText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  btnNoText:  { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
});
