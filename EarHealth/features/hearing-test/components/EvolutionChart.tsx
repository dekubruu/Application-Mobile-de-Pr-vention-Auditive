import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { useThemeColors } from '@/features/theme/ThemeContext';

// ── Line chart of a single metric over time ──────────────────────────────────
// Hand-rolled (no charting dependency) with the same absolute-View + rotated
// segment technique as AudiogramChart. Points are evenly spaced along X in
// chronological order; Y is auto-scaled to the value range.

export interface EvolutionPoint {
  date:  string;   // ISO
  value: number;
}

interface EvolutionChartProps {
  points:         EvolutionPoint[];   // chronological (oldest → newest)
  unit:           string;             // 'dB' | 'kHz' | '/100'
  betterWhenHigher: boolean;
  height?:        number;
}

interface XY { x: number; y: number; }

const GRID_LINES = 4;

function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatValue(v: number, unit: string): string {
  if (unit === 'kHz') return v.toFixed(1);
  return String(Math.round(v));
}

export const EvolutionChart: React.FC<EvolutionChartProps> = ({
  points, unit, betterWhenHigher, height = 200,
}) => {
  const { colors: tierColors } = useThemeColors();
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height: h } = e.nativeEvent.layout;
    if (width !== size.w || h !== size.h) setSize({ w: width, h });
  };

  const padL = 38;
  const padR = 14;
  const padT = 16;
  const padB = 26;
  const plotW = Math.max(0, size.w - padL - padR);
  const plotH = Math.max(0, size.h - padT - padB);

  // Y range with padding so points never touch the edges. Guard the flat case
  // (all values equal) by forcing a small symmetric band.
  const values = points.map(p => p.value);
  let yMin = Math.min(...values);
  let yMax = Math.max(...values);
  if (yMin === yMax) {
    const pad = Math.max(1, Math.abs(yMin) * 0.1);
    yMin -= pad; yMax += pad;
  } else {
    const pad = (yMax - yMin) * 0.15;
    yMin -= pad; yMax += pad;
  }

  const xFor = (i: number): number =>
    points.length === 1 ? padL + plotW / 2 : padL + (i / (points.length - 1)) * plotW;
  const yFor = (v: number): number =>
    padT + ((yMax - v) / (yMax - yMin)) * plotH;

  const pts: XY[] = points.map((p, i) => ({ x: xFor(i), y: yFor(p.value) }));

  // Only label every date when there are few points, else just first & last.
  const labelEvery = points.length <= 5;

  return (
    <View style={styles.wrap}>
      <View style={[styles.chart, { height }]} onLayout={onLayout}>
        {/* Horizontal grid + Y labels */}
        {Array.from({ length: GRID_LINES + 1 }).map((_, i) => {
          const v = yMax - (i / GRID_LINES) * (yMax - yMin);
          const y = yFor(v);
          return (
            <React.Fragment key={`g-${i}`}>
              <View style={[styles.gridLine, { left: padL, right: padR, top: y }]} />
              <Text style={[styles.yLabel, { top: y - 7 }]}>{formatValue(v, unit)}</Text>
            </React.Fragment>
          );
        })}

        {/* Segments between consecutive points */}
        {pts.length > 1 && pts.slice(0, -1).map((p, i) => (
          <Segment key={`s-${i}`} from={p} to={pts[i + 1]} color={tierColors.primary} />
        ))}

        {/* Markers + value labels */}
        {pts.map((p, i) => (
          <React.Fragment key={`m-${i}`}>
            <View
              style={[styles.dot, { left: p.x - 5, top: p.y - 5, borderColor: tierColors.primary }]}
            />
            {(labelEvery || i === 0 || i === pts.length - 1) && (
              <Text
                style={[styles.valueLabel, { left: p.x - 20, top: p.y - 24, color: tierColors.primaryDark }]}
              >
                {formatValue(points[i].value, unit)}
              </Text>
            )}
          </React.Fragment>
        ))}

        {/* X date labels */}
        {points.map((p, i) => {
          if (!(labelEvery || i === 0 || i === points.length - 1)) return null;
          return (
            <Text
              key={`x-${i}`}
              style={[styles.xLabel, { left: xFor(i) - 26, top: padT + plotH + 6 }]}
            >
              {shortDate(p.date)}
            </Text>
          );
        })}
      </View>

      <View style={styles.caption}>
        <Text style={styles.captionUnit}>{unit === '/100' ? 'Score /100' : `Valeur (${unit})`}</Text>
        <Text style={styles.captionHint}>
          {betterWhenHigher ? '↑ plus haut = mieux' : '↓ plus bas = mieux'}
        </Text>
      </View>
    </View>
  );
};

// Line segment between two points (rotated View) — same trick as AudiogramChart.
const Segment: React.FC<{ from: XY; to: XY; color: string }> = ({ from, to, color }) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle  = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left:  from.x,
        top:   from.y - 1.25,
        width: length,
        height: 2.5,
        backgroundColor: color,
        borderRadius: 2,
        transform: [{ rotateZ: `${angle}deg` }],
        transformOrigin: '0% 50%',
      }}
    />
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    gap: 8,
  },
  chart: {
    width: '100%',
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  yLabel: {
    position: 'absolute',
    left: 2,
    width: 30,
    fontSize: 10,
    color: Colors.textTertiary,
    fontWeight: '600',
    textAlign: 'right',
  },
  xLabel: {
    position: 'absolute',
    width: 52,
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.surface,
    borderWidth: 2.5,
  },
  valueLabel: {
    position: 'absolute',
    width: 40,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  caption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  captionUnit: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
  captionHint: { fontSize: 11, fontWeight: '600', color: Colors.textTertiary },
});
