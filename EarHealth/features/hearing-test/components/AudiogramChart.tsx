import React, { useState } from 'react';
import { LayoutChangeEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle as SvgCircle, Line as SvgLine } from 'react-native-svg';
import { Colors } from '@/constants/colors';
import { toDisplayDb } from '../constants/hearing-test.constants';
import { PTT_FREQUENCIES } from '../services/PTTAlgorithm';
import type { PTTEarResult } from '../types/ptt.types';

// Clinical audiogram conventions:
//   • Right ear: red, circle marker (O)
//   • Left  ear: blue, cross marker (X)
//   • Previous visit (if any): same colours, dashed line + hollow circle, faded
//   • Y axis (dB, uncalibrated relative scale) inverted: top end = better hearing
//   • X axis (Hz) on log scale
//
// The chart's vertical range is INTENTIONALLY decoupled from PTT_MIN_DB /
// PTT_MAX_DB so future algorithm tuning (e.g. extending the staircase to
// -30 dB) does not silently rescale the chart and break the position of the
// 0 dB clinical reference line.

const CLINICAL_RIGHT = '#C0392B';
const CLINICAL_LEFT  = '#2A6BC1';

// Chart-specific range. Spans the "better than normal" zone (negative dB)
// at the top through severe hearing loss at the bottom.
const CHART_MIN_DB = -20;
const CHART_MAX_DB = 80;

const Y_LINES = [-20, 0, 20, 40, 60, 80];

interface AudiogramChartProps {
  earResults: PTTEarResult[];
  /** Previous PTT test, if any — drawn as a faded/dashed overlay for comparison. */
  previousEarResults?: PTTEarResult[] | null;
  height?: number;
}

interface Point { x: number; y: number; }

export const AudiogramChart: React.FC<AudiogramChartProps> = ({
  earResults,
  previousEarResults,
  height = 240,
}) => {
  // Measured once from the non-scrolling wrapper so the chart's content can
  // have a fixed pixel width — required by the zoom ScrollView below (a
  // percentage width doesn't resolve inside a ScrollView's content).
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w !== width) setWidth(w);
  };

  const left  = earResults.find(e => e.ear === 'left');
  const right = earResults.find(e => e.ear === 'right');
  const prevLeft  = previousEarResults?.find(e => e.ear === 'left');
  const prevRight = previousEarResults?.find(e => e.ear === 'right');

  // Plot area inside the chart (margins for axis labels)
  const padL = 36;
  const padR = 12;
  const padT = 10;
  // Bottom margin must fit both the frequency tick labels (top: +6) and the
  // "Fréquence (Hz)" axis title (top: +20) below the plot, or the
  // container's overflow:hidden clips the title.
  const padB = 36;
  const plotW = Math.max(0, width - padL - padR);
  const plotH = Math.max(0, height - padT - padB);

  // Coordinate transforms (log freq, linear dB inverted)
  const minLog = Math.log(PTT_FREQUENCIES[0]);
  const maxLog = Math.log(PTT_FREQUENCIES[PTT_FREQUENCIES.length - 1]);

  function freqToX(hz: number): number {
    return padL + ((Math.log(hz) - minLog) / (maxLog - minLog)) * plotW;
  }
  function dbToY(db: number): number {
    const clamped = Math.min(CHART_MAX_DB, Math.max(CHART_MIN_DB, db));
    // Offset by CHART_MIN_DB so that the *visual* top of the plot maps to
    // CHART_MIN_DB (the best hearing), not to dB=0. Without this offset a
    // negative threshold would render ABOVE the plot area.
    return padT + ((clamped - CHART_MIN_DB) / (CHART_MAX_DB - CHART_MIN_DB)) * plotH;
  }

  function pointsFor(ear: PTTEarResult | undefined): Point[] {
    if (!ear) return [];
    return ear.thresholds.map(t => ({
      x: freqToX(t.frequency),
      y: dbToY(t.thresholdDb),
    }));
  }

  const rPts = pointsFor(right);
  const lPts = pointsFor(left);
  const prevRPts = pointsFor(prevRight);
  const prevLPts = pointsFor(prevLeft);
  const hasPrevious = prevRPts.length > 0 || prevLPts.length > 0;

  return (
    <View style={styles.zoomOuter} onLayout={onLayout}>
      <ScrollView
        style={{ height }}
        minimumZoomScale={1}
        maximumZoomScale={2.5}
        bouncesZoom
        pinchGestureEnabled
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.container, { width, height }]}>
          {/* Y axis horizontal grid + labels */}
          {/* Y_LINES holds INTERNAL dB values (drive grid position via dbToY). */}
          {/* The visible label is offset to the user-facing 0..100 scale. */}
          {Y_LINES.map(db => {
            const y = dbToY(db);
            // Internal 0 dB (visible "20") is the clinical reference line — emphasize.
            // Internal 20 dB (visible "40") marks mild-loss threshold — slight emphasis.
            const opacity = db === 0 ? 0.55 : db === 20 ? 0.35 : 0.16;
            return (
              <React.Fragment key={`y-${db}`}>
                <View style={[styles.gridLine, { left: padL, right: padR, top: y, opacity }]} />
                <Text style={[styles.axisLabelY, { top: y - 7 }]}>{toDisplayDb(db)}</Text>
              </React.Fragment>
            );
          })}

          {/* X axis labels */}
          {PTT_FREQUENCIES.map(hz => {
            const x = freqToX(hz);
            return (
              <Text key={`x-${hz}`} style={[styles.axisLabelX, { left: x - 18, top: padT + plotH + 6 }]}>
                {hz >= 1000 ? `${hz / 1000}k` : hz}
              </Text>
            );
          })}

          {/* Normal hearing band: 0–20 dB (light green) */}
          <View style={[
            styles.normalBand,
            { left: padL, right: padR, top: dbToY(0), height: dbToY(20) - dbToY(0) },
          ]} />

          {/* Previous-visit overlay: dashed + faded, drawn under the current
              test's solid lines/markers so the latest result stays primary. */}
          {hasPrevious && (
            <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
              {prevRPts.length > 1 && prevRPts.slice(0, -1).map((p, i) => (
                <SvgLine
                  key={`pr-l-${i}`}
                  x1={p.x} y1={p.y} x2={prevRPts[i + 1].x} y2={prevRPts[i + 1].y}
                  stroke={CLINICAL_RIGHT} strokeWidth={1.5} strokeDasharray="5,4" opacity={0.4}
                />
              ))}
              {prevRPts.map((p, i) => (
                <SvgCircle
                  key={`pr-m-${i}`} cx={p.x} cy={p.y} r={5}
                  stroke={CLINICAL_RIGHT} strokeWidth={1.5} fill="none" opacity={0.4}
                />
              ))}
              {prevLPts.length > 1 && prevLPts.slice(0, -1).map((p, i) => (
                <SvgLine
                  key={`pl-l-${i}`}
                  x1={p.x} y1={p.y} x2={prevLPts[i + 1].x} y2={prevLPts[i + 1].y}
                  stroke={CLINICAL_LEFT} strokeWidth={1.5} strokeDasharray="5,4" opacity={0.4}
                />
              ))}
              {prevLPts.map((p, i) => (
                <SvgCircle
                  key={`pl-m-${i}`} cx={p.x} cy={p.y} r={5}
                  stroke={CLINICAL_LEFT} strokeWidth={1.5} fill="none" opacity={0.4}
                />
              ))}
            </Svg>
          )}

          {/* Right ear line + markers */}
          {rPts.length > 1 && rPts.slice(0, -1).map((p, i) => {
            const next = rPts[i + 1];
            return <Segment key={`r-l-${i}`} from={p} to={next} color={CLINICAL_RIGHT} />;
          })}
          {rPts.map((p, i) => (
            <View
              key={`r-m-${i}`}
              style={[styles.markerO, { left: p.x - 7, top: p.y - 7, borderColor: CLINICAL_RIGHT }]}
            />
          ))}

          {/* Left ear line + markers */}
          {lPts.length > 1 && lPts.slice(0, -1).map((p, i) => {
            const next = lPts[i + 1];
            return <Segment key={`l-l-${i}`} from={p} to={next} color={CLINICAL_LEFT} />;
          })}
          {lPts.map((p, i) => (
            <View key={`l-m-${i}`} style={[styles.markerXWrap, { left: p.x - 7, top: p.y - 7 }]}>
              <View style={[styles.markerXLine1, { backgroundColor: CLINICAL_LEFT }]} />
              <View style={[styles.markerXLine2, { backgroundColor: CLINICAL_LEFT }]} />
            </View>
          ))}

          {/* Axis titles */}
          {/* Unit is "dB" (not "dB HL") — the scale is uncalibrated. */}
          <Text style={styles.titleY}>dB</Text>
          <Text style={[styles.titleX, { left: padL, right: padR, top: padT + plotH + 20 }]}>
            Fréquence (Hz)
          </Text>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.markerOSmall, { borderColor: CLINICAL_RIGHT }]} />
              <Text style={[styles.legendText, { color: CLINICAL_RIGHT }]}>Droite</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.markerXSmallWrap}>
                <View style={[styles.markerXSmallLine1, { backgroundColor: CLINICAL_LEFT }]} />
                <View style={[styles.markerXSmallLine2, { backgroundColor: CLINICAL_LEFT }]} />
              </View>
              <Text style={[styles.legendText, { color: CLINICAL_LEFT }]}>Gauche</Text>
            </View>
            {hasPrevious && (
              <View style={styles.legendItem}>
                <Svg width={14} height={8}>
                  <SvgLine
                    x1={0} y1={4} x2={14} y2={4}
                    stroke={Colors.textTertiary} strokeWidth={1.5} strokeDasharray="4,3"
                  />
                </Svg>
                <Text style={[styles.legendText, { color: Colors.textTertiary }]}>Précédent</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// ── Line segment between two points (rotated View) ───────────────────────────

const Segment: React.FC<{ from: Point; to: Point; color: string }> = ({ from, to, color }) => {
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
        top:   from.y - 1,
        width: length,
        height: 2,
        backgroundColor: color,
        transform: [{ translateX: 0 }, { rotateZ: `${angle}deg` }],
        transformOrigin: '0% 50%',
      }}
    />
  );
};

const styles = StyleSheet.create({
  zoomOuter: { width: '100%' },

  container: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
    overflow: 'hidden',
  },

  gridLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: Colors.textTertiary,
  },

  axisLabelY: {
    position: 'absolute',
    left: 4,
    width: 28,
    fontSize: 10,
    color: Colors.textTertiary,
    fontWeight: '600',
    textAlign: 'right',
  },
  axisLabelX: {
    position: 'absolute',
    width: 36,
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },

  normalBand: {
    position: 'absolute',
    backgroundColor: '#DCFCE7',
    opacity: 0.5,
  },

  // Right ear: open circle (O)
  markerO: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    backgroundColor: 'transparent',
  },

  // Left ear: cross (X) made from two rotated bars
  markerXWrap: {
    position: 'absolute',
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerXLine1: {
    position: 'absolute',
    width: 16,
    height: 2.5,
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
  },
  markerXLine2: {
    position: 'absolute',
    width: 16,
    height: 2.5,
    borderRadius: 1,
    transform: [{ rotate: '-45deg' }],
  },

  titleY: {
    position: 'absolute',
    left: -8,
    top: 4,
    width: 50,
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textTertiary,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  titleX: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textTertiary,
    textAlign: 'center',
    letterSpacing: 0.4,
  },

  legend: {
    position: 'absolute',
    right: 10,
    top: 8,
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { fontSize: 10, fontWeight: '700' },

  markerOSmall: {
    width: 12, height: 12,
    borderRadius: 6,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  markerXSmallWrap: {
    width: 12, height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerXSmallLine1: {
    position: 'absolute',
    width: 14, height: 2,
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
  },
  markerXSmallLine2: {
    position: 'absolute',
    width: 14, height: 2,
    borderRadius: 1,
    transform: [{ rotate: '-45deg' }],
  },
});
