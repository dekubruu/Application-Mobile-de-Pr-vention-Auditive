import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import {
  HFRT_MAX_FREQ,
  HFRT_MIN_FREQ,
} from '../services/HFRTAlgorithm';
import { HoldButton } from './HoldButton';

interface HFRTTestingViewProps {
  currentFreq: number;
  isHeld:      boolean;
  onHoldStart: () => void;
  onHoldEnd:   () => void;
}

function freqProgress(freq: number): number {
  // Log scale 0..1 between min and max
  const lo = Math.log(HFRT_MIN_FREQ);
  const hi = Math.log(HFRT_MAX_FREQ);
  const v  = Math.log(Math.min(HFRT_MAX_FREQ, Math.max(HFRT_MIN_FREQ, freq)));
  return (v - lo) / (hi - lo);
}

function formatHz(freq: number): { value: string; unit: string } {
  if (freq >= 1000) {
    const k = freq / 1000;
    return { value: k.toFixed(k >= 10 ? 1 : 2), unit: 'kHz' };
  }
  return { value: String(Math.round(freq)), unit: 'Hz' };
}

export const HFRTTestingView: React.FC<HFRTTestingViewProps> = ({
  currentFreq,
  isHeld,
  onHoldStart,
  onHoldEnd,
}) => {
  const pct = freqProgress(currentFreq);
  const { value, unit } = formatHz(currentFreq);

  return (
    <View style={styles.container}>
      {/* Frequency display */}
      <View style={styles.freqCard}>
        <Text style={styles.label}>FRÉQUENCE COURANTE</Text>
        <View style={styles.valueRow}>
          <Text style={styles.value}>{value}</Text>
          <Text style={styles.unit}>{unit}</Text>
        </View>

        {/* Progress gauge */}
        <View style={styles.gaugeTrack}>
          <View style={[styles.gaugeFill, { width: `${pct * 100}%` }]} />
        </View>
        <View style={styles.gaugeLabels}>
          <Text style={styles.gaugeLabel}>{HFRT_MIN_FREQ / 1000} kHz</Text>
          <Text style={styles.gaugeLabel}>{HFRT_MAX_FREQ / 1000} kHz</Text>
        </View>
      </View>

      {/* Hold button */}
      <HoldButton
        active={isHeld}
        onHoldStart={onHoldStart}
        onHoldEnd={onHoldEnd}
        label="J'entends"
        hint="Maintenez tant que vous entendez. Relâchez dès que la fréquence devient inaudible."
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 22, paddingHorizontal: 18 },

  freqCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 16 },
  value: {
    fontSize: 60,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -2.5,
    lineHeight: 64,
  },
  unit: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.3,
  },

  gaugeTrack: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  gaugeLabels: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  gaugeLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: '600',
  },
});
