import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { useThemeColors } from '@/features/theme/ThemeContext';
import { formatFrequency, toDisplayDb } from '../constants/hearing-test.constants';
import { PTT_FREQUENCIES } from '../services/PTTAlgorithm';
import type { PTTEar, PTTFrequencyResult } from '../types/ptt.types';
import { HoldButton } from './HoldButton';

interface PTTTestingViewProps {
  ear:              PTTEar;
  freqIndex:        number;
  totalFreqs:       number;
  currentFrequency: number;
  currentDb:        number;
  isHeld:           boolean;
  isPulsing:        boolean;
  inactiveWarn:     boolean;
  completedFreqs:   PTTFrequencyResult[];
  onHoldStart:      () => void;
  onHoldEnd:        () => void;
}

export const PTTTestingView: React.FC<PTTTestingViewProps> = ({
  ear,
  freqIndex,
  totalFreqs,
  currentFrequency,
  currentDb,
  isHeld,
  isPulsing,
  inactiveWarn,
  completedFreqs,
  onHoldStart,
  onHoldEnd,
}) => {
  const { colors: tierColors } = useThemeColors();
  const doneSet = new Set(completedFreqs.map(c => c.frequency));

  return (
    <View style={styles.container}>
      {/* Ear & progress */}
      <View style={styles.topBar}>
        <View style={[styles.earBadge, { backgroundColor: tierColors.primaryLight }]}>
          <Ionicons
            name={ear === 'left' ? 'arrow-back' : 'arrow-forward'}
            size={12}
            color={tierColors.primary}
          />
          <Text style={[styles.earBadgeText, { color: tierColors.primary }]}>
            OREILLE {ear === 'left' ? 'GAUCHE' : 'DROITE'}
          </Text>
        </View>
        <Text style={styles.progress}>
          {freqIndex + 1}<Text style={styles.progressTotal}> / {totalFreqs}</Text>
        </Text>
      </View>

      {/* Frequency dots */}
      <View style={styles.dotsRow}>
        {PTT_FREQUENCIES.map((freq, i) => {
          const isDone    = doneSet.has(freq);
          const isCurrent = i === freqIndex && !isDone;
          return (
            <View key={freq} style={styles.dotWrap}>
              <View style={[
                styles.dot,
                isDone    && styles.dotDone,
                isCurrent && { backgroundColor: tierColors.primary },
              ]}>
                {isDone    && <Ionicons name="checkmark" size={11} color="#fff" />}
                {isCurrent && <View style={styles.dotPulse} />}
              </View>
              <Text style={styles.dotLabel}>{formatFrequency(freq)}</Text>
            </View>
          );
        })}
      </View>

      {/* Current readings */}
      <View style={styles.readingsCard}>
        <View style={styles.reading}>
          <Text style={styles.readingLabel}>FRÉQUENCE</Text>
          <Text style={styles.readingValue}>{currentFrequency.toLocaleString()}</Text>
          <Text style={styles.readingUnit}>Hz</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.reading}>
          <Text style={styles.readingLabel}>VOLUME</Text>
          <Text style={styles.readingValue}>{toDisplayDb(currentDb)}</Text>
          <Text style={styles.readingUnit}>dB</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.reading}>
          <Text style={styles.readingLabel}>PULSE</Text>
          <View
            style={[
              styles.pulseDot,
              isPulsing ? { backgroundColor: tierColors.primary } : styles.pulseDotOff,
            ]}
          />
          <Text style={styles.readingUnit}>{isPulsing ? 'on' : 'off'}</Text>
        </View>
      </View>

      {/* Inactivity warning */}
      {inactiveWarn && (
        <View style={styles.warnBox}>
          <Ionicons name="warning-outline" size={16} color={Colors.warning} />
          <Text style={styles.warnText}>
            Aucune action détectée. Maintenez quand vous entendez, relâchez quand le son disparaît.
          </Text>
        </View>
      )}

      {/* Hold button */}
      <HoldButton
        active={isHeld}
        onHoldStart={onHoldStart}
        onHoldEnd={onHoldEnd}
        label="J’entends"
        hint="Maintenez tant que vous percevez le son. Relâchez dès qu’il disparaît."
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 18, paddingHorizontal: 18 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  earBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  earBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  progress: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  progressTotal: {
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

  readingsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  reading: { flex: 1, alignItems: 'center' },
  readingLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  readingValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -1,
    lineHeight: 32,
  },
  readingUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: -2,
  },
  divider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 6,
  },

  pulseDot: {
    width:  16,
    height: 16,
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  pulseDotOff: { backgroundColor: Colors.borderLight, borderWidth: 1, borderColor: Colors.border },

  warnBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: Colors.warningLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  warnText: {
    flex: 1,
    fontSize: 12,
    color: Colors.warning,
    lineHeight: 17,
    fontWeight: '600',
  },
});
