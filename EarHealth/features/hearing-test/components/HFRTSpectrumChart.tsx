import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { HFRT_MAX_FREQ, HFRT_MIN_FREQ } from '../services/HFRTAlgorithm';

// Horizontal LOG-frequency scale (8 → 20 kHz) with colored "age-bracket" zones,
// a marker at the user's audible limit, and an optional reference marker for the
// average expected at the user's age. Built with plain Views (no SVG dependency),
// consistent with AudiogramChart.
//
// The zones mirror the fixed-threshold quality brackets (worst → best) used by
// interpretMaxFrequency, so the colored position and the textual label agree.

const CHART_MIN_HZ = HFRT_MIN_FREQ; // 8000
const CHART_MAX_HZ = HFRT_MAX_FREQ; // 20000

const ZONES: { from: number; to: number; color: string }[] = [
  { from: 8000,  to: 9000,  color: '#FEE2E2' }, // Limitée
  { from: 9000,  to: 11000, color: '#FFE4D5' }, // Réduite
  { from: 11000, to: 13000, color: '#FEF3C7' }, // Correcte
  { from: 13000, to: 15000, color: '#E0F2F7' }, // Bonne
  { from: 15000, to: 17000, color: '#CFFAF1' }, // Très bonne
  { from: 17000, to: 20000, color: '#DCFCE7' }, // Excellente
];

const TICKS = [8000, 10000, 12000, 14000, 16000, 18000, 20000];

const BAND_H = 42;
const PAD_L  = 8;
const PAD_R  = 8;

interface HFRTSpectrumChartProps {
  maxHz:       number;
  hitCeiling:  boolean;
  expectedHz?: number | null;
}

export const HFRTSpectrumChart: React.FC<HFRTSpectrumChartProps> = ({
  maxHz, hitCeiling, expectedHz,
}) => {
  const [w, setW] = useState(0);
  const [pillW, setPillW] = useState(64); // measured at layout; 64 = sane default
  const onLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width !== w) setW(width);
  };

  const plotW  = Math.max(0, w - PAD_L - PAD_R);
  const minLog = Math.log(CHART_MIN_HZ);
  const maxLog = Math.log(CHART_MAX_HZ);

  const freqToX = (hz: number): number => {
    const clamped = Math.min(CHART_MAX_HZ, Math.max(CHART_MIN_HZ, hz));
    return PAD_L + ((Math.log(clamped) - minLog) / (maxLog - minLog)) * plotW;
  };

  const ready     = plotW > 0;
  const markerX   = freqToX(maxHz);
  const expectedX = expectedHz != null ? freqToX(expectedHz) : null;
  const kHzLabel  = hitCeiling ? '≥ 20' : (maxHz / 1000).toFixed(1);
  // Center the pill on the marker, clamped to the real measured pill width so a
  // wide label (e.g. "≥ 20 kHz") near the right edge cannot overflow the chart.
  const pillLeft  = Math.min(Math.max(markerX - pillW / 2, 0), Math.max(0, w - pillW));

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      {/* Result pill above the marker */}
      {ready && (
        <View
          style={[styles.pill, { left: pillLeft }]}
          pointerEvents="none"
          onLayout={(e) => {
            const pw = e.nativeEvent.layout.width;
            if (pw && Math.abs(pw - pillW) > 0.5) setPillW(pw);
          }}
        >
          <Text style={styles.pillText}>{kHzLabel} kHz</Text>
        </View>
      )}

      {/* Colored zone band */}
      <View style={styles.band}>
        {ready && ZONES.map(z => {
          const x0 = freqToX(z.from);
          const x1 = freqToX(z.to);
          return (
            <View
              key={z.from}
              style={[styles.zone, { left: x0, width: Math.max(0, x1 - x0), backgroundColor: z.color }]}
            />
          );
        })}

        {/* Expected-for-age reference marker (dashed look) */}
        {ready && expectedX != null && (
          <View style={[styles.expectedLine, { left: expectedX }]} pointerEvents="none" />
        )}

        {/* User's result marker */}
        {ready && (
          <>
            <View style={[styles.markerLine, { left: markerX }]} pointerEvents="none" />
            <View style={[styles.markerDot, { left: markerX - 5 }]} pointerEvents="none" />
          </>
        )}
      </View>

      {/* Axis ticks */}
      <View style={styles.ticks}>
        {ready && TICKS.map(t => {
          const left = Math.min(Math.max(freqToX(t) - 14, 0), Math.max(0, w - 28));
          return (
            <Text key={t} style={[styles.tick, { left }]}>{t / 1000}k</Text>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <Text style={styles.legendEnd}>Limite plus basse</Text>
        {expectedX != null && (
          <View style={styles.legendMid}>
            <View style={styles.legendDash} />
            <Text style={styles.legendMidText}>moyenne de votre âge</Text>
          </View>
        )}
        <Text style={styles.legendEnd}>plus haute</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    paddingTop: 24,   // room for the pill
    position: 'relative',
  },

  pill: {
    position: 'absolute',
    top: 0,
    minWidth: 60,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  pillText: { fontSize: 12, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },

  band: {
    height: BAND_H,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceSecondary,
    position: 'relative',
  },
  zone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  markerLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2.5,
    backgroundColor: Colors.primaryDark,
  },
  markerDot: {
    position: 'absolute',
    top: BAND_H / 2 - 5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primaryDark,
    borderWidth: 2,
    borderColor: '#fff',
  },
  expectedLine: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: 1.5,
    backgroundColor: Colors.textSecondary,
    opacity: 0.55,
  },

  ticks: {
    height: 16,
    marginTop: 6,
    position: 'relative',
  },
  tick: {
    position: 'absolute',
    width: 28,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textTertiary,
  },

  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  legendEnd: { fontSize: 10, color: Colors.textTertiary, fontWeight: '600' },
  legendMid: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDash: { width: 12, height: 1.5, backgroundColor: Colors.textSecondary, opacity: 0.55 },
  legendMidText: { fontSize: 10, color: Colors.textSecondary, fontWeight: '600' },
});
