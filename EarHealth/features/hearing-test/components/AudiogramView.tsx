import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { formatFrequency } from '../constants/hearing-test.constants';
import type { FrequencyThreshold } from '../types/hearing-test.types';

// Audiogram convention: Left = blue (O), Right = red (X)
const LEFT_COLOR  = '#1D4ED8'; // blue
const RIGHT_COLOR = '#B91C1C'; // red
const MONO_COLOR  = Colors.primaryDark;

interface AudiogramViewProps {
  leftResults?:  FrequencyThreshold[];
  rightResults?: FrequencyThreshold[];
  monoResults?:  FrequencyThreshold[];
}

// ── Chart constants ────────────────────────────────────────────────────────────
const CHART_HEIGHT        = 180;
const CHART_PADDING_TOP   = 8;
const CHART_PADDING_LEFT  = 40;
const CHART_PADDING_RIGHT = 12;
const CHART_PADDING_BOT   = 28;
const DB_MIN              = 0;
const DB_MAX              = 80;
const GRID_DBS            = [0, 20, 40, 60, 80];
const NORMAL_MAX_DB       = 20;
// Speech frequencies: 500 Hz – 4 kHz
const SPEECH_FREQ_MIN     = 500;
const SPEECH_FREQ_MAX     = 4000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function dbToY(db: number): number {
  return CHART_PADDING_TOP + ((db - DB_MIN) / (DB_MAX - DB_MIN)) * CHART_HEIGHT;
}

function freqToX(index: number, total: number, availWidth: number): number {
  if (total === 1) return CHART_PADDING_LEFT + availWidth / 2;
  return CHART_PADDING_LEFT + (index / (total - 1)) * availWidth;
}

// SVG-free diagonal line via View + transform
function Line({ x1, y1, x2, y2, color, thickness = 2 }: {
  x1: number; y1: number; x2: number; y2: number;
  color: string; thickness?: number;
}) {
  const dx     = x2 - x1;
  const dy     = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle  = Math.atan2(dy, dx) * (180 / Math.PI);
  const cx     = (x1 + x2) / 2;
  const cy     = (y1 + y2) / 2;
  return (
    <View style={{
      position:  'absolute',
      width:     length,
      height:    thickness,
      left:      cx - length / 2,
      top:       cy - thickness / 2,
      backgroundColor: color,
      borderRadius: thickness / 2,
      transform: [{ rotate: `${angle}deg` }],
    }} />
  );
}

// O symbol (open circle) for left ear
// X symbol for right ear
function DataPoint({ x, y, color, symbol }: { x: number; y: number; color: string; symbol: 'O' | 'X' }) {
  const size = 14;
  return (
    <View style={{
      position:        'absolute',
      width:           size,
      height:          size,
      borderRadius:    symbol === 'O' ? size / 2 : 0,
      borderWidth:     2,
      borderColor:     color,
      backgroundColor: 'transparent',
      left:            x - size / 2,
      top:             y - size / 2,
      justifyContent:  'center',
      alignItems:      'center',
    }}>
      {symbol === 'X' && <Text style={{ fontSize: 9, color, fontWeight: '800', lineHeight: 11 }}>×</Text>}
    </View>
  );
}

function ChartArea({ results, symbol, color, availWidth, allFreqs }: {
  results:    FrequencyThreshold[];
  symbol:     'O' | 'X';
  color:      string;
  availWidth: number;
  allFreqs:   number[];
}) {
  const sorted = [...results].sort((a, b) => a.frequency - b.frequency);
  const total  = allFreqs.length;

  return (
    <>
      {sorted.map((r, i) => {
        if (i === 0) return null;
        const prev     = sorted[i - 1];
        const prevIdx  = allFreqs.indexOf(prev.frequency);
        const currIdx  = allFreqs.indexOf(r.frequency);
        const x1 = freqToX(prevIdx, total, availWidth);
        const y1 = dbToY(prev.dbLevel);
        const x2 = freqToX(currIdx, total, availWidth);
        const y2 = dbToY(r.dbLevel);
        return (
          <Line key={`line-${r.frequency}`} x1={x1} y1={y1} x2={x2} y2={y2}
                color={color} thickness={2} />
        );
      })}
      {sorted.map(r => {
        const idx = allFreqs.indexOf(r.frequency);
        const x   = freqToX(idx, total, availWidth);
        const y   = dbToY(r.dbLevel);
        return (
          <DataPoint key={`pt-${r.frequency}`} x={x} y={y} color={color} symbol={symbol} />
        );
      })}
    </>
  );
}

// ── Exported component ────────────────────────────────────────────────────────

export const AudiogramView: React.FC<AudiogramViewProps> = ({
  leftResults,
  rightResults,
  monoResults,
}) => {
  const [containerWidth, setContainerWidth] = useState(280);

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const isMono    = !!monoResults  && monoResults.length  > 0;
  const showLeft  = !isMono && !!leftResults  && leftResults.length  > 0;
  const showRight = !isMono && !!rightResults && rightResults.length > 0;

  const allFreqs = Array.from(new Set([
    ...(leftResults  || []).map(r => r.frequency),
    ...(rightResults || []).map(r => r.frequency),
    ...(monoResults  || []).map(r => r.frequency),
  ])).sort((a, b) => a - b);

  const availWidth = containerWidth - CHART_PADDING_LEFT - CHART_PADDING_RIGHT;
  const totalH     = CHART_PADDING_TOP + CHART_HEIGHT + CHART_PADDING_BOT;

  // Speech zone x positions
  const speechMinIdx = allFreqs.indexOf(SPEECH_FREQ_MIN);
  const speechMaxIdx = allFreqs.indexOf(SPEECH_FREQ_MAX);
  const hasSpeechZone = speechMinIdx !== -1 && speechMaxIdx !== -1 && speechMaxIdx > speechMinIdx;
  const speechLeft  = hasSpeechZone ? freqToX(speechMinIdx, allFreqs.length, availWidth) : 0;
  const speechRight = hasSpeechZone ? freqToX(speechMaxIdx, allFreqs.length, availWidth) : 0;

  return (
    <View onLayout={onLayout}>
      {/* Legend */}
      <View style={styles.legend}>
        {showLeft && (
          <View style={styles.legendItem}>
            <View style={[styles.legendSymbol, { borderColor: LEFT_COLOR, borderRadius: 6 }]} />
            <Text style={styles.legendText}>Gauche (O) — bleu</Text>
          </View>
        )}
        {showRight && (
          <View style={styles.legendItem}>
            <View style={[styles.legendSymbol, { borderColor: RIGHT_COLOR }]} />
            <Text style={styles.legendText}>Droite (×) — rouge</Text>
          </View>
        )}
        {isMono && (
          <View style={styles.legendItem}>
            <View style={[styles.legendSymbol, { borderColor: MONO_COLOR, borderRadius: 6 }]} />
            <Text style={styles.legendText}>Global (O)</Text>
          </View>
        )}
      </View>

      {/* Chart */}
      <View style={{ height: totalH, position: 'relative' }}>

        {/* Normal hearing zone (green tint, 0–20 dB) */}
        <View style={{
          position:        'absolute',
          left:            CHART_PADDING_LEFT,
          right:           CHART_PADDING_RIGHT,
          top:             dbToY(DB_MIN),
          height:          dbToY(NORMAL_MAX_DB) - dbToY(DB_MIN),
          backgroundColor: '#DCFCE780',
        }} />

        {/* Speech banana zone (light blue tint, 500 Hz – 4 kHz) */}
        {hasSpeechZone && (
          <View style={{
            position:        'absolute',
            left:            speechLeft,
            width:           speechRight - speechLeft,
            top:             dbToY(DB_MIN),
            height:          CHART_HEIGHT,
            backgroundColor: '#DBEAFE40',
          }} />
        )}

        {/* Grid lines + Y-axis labels */}
        {GRID_DBS.map(db => {
          const y = dbToY(db);
          return (
            <React.Fragment key={`grid-${db}`}>
              <View style={{
                position:        'absolute',
                left:            CHART_PADDING_LEFT,
                right:           CHART_PADDING_RIGHT,
                top:             y,
                height:          1,
                backgroundColor: db === 0 ? Colors.border : Colors.borderLight,
              }} />
              <Text style={[styles.yLabel, { top: y - 7 }]}>{db}</Text>
            </React.Fragment>
          );
        })}

        <Text style={styles.yAxisTitle}>dB</Text>

        {/* X-axis labels */}
        {allFreqs.map((freq, i) => (
          <Text key={`xlabel-${freq}`} style={[styles.xLabel, {
            left: CHART_PADDING_LEFT + freqToX(i, allFreqs.length, availWidth) - 18,
            top:  CHART_PADDING_TOP + CHART_HEIGHT + 6,
          }]}>
            {formatFrequency(freq)}
          </Text>
        ))}

        {showLeft && leftResults && (
          <ChartArea results={leftResults} symbol="O" color={LEFT_COLOR}
                     availWidth={availWidth} allFreqs={allFreqs} />
        )}
        {showRight && rightResults && (
          <ChartArea results={rightResults} symbol="X" color={RIGHT_COLOR}
                     availWidth={availWidth} allFreqs={allFreqs} />
        )}
        {isMono && monoResults && (
          <ChartArea results={monoResults} symbol="O" color={MONO_COLOR}
                     availWidth={availWidth} allFreqs={allFreqs} />
        )}
      </View>

      {/* Annotations */}
      <View style={styles.annotations}>
        <View style={styles.annotationItem}>
          <View style={[styles.annotationDot, { backgroundColor: '#DCFCE7', borderColor: Colors.success }]} />
          <Text style={[styles.annotationText, { color: Colors.success }]}>Normale (0–20 dB)</Text>
        </View>
        {hasSpeechZone && (
          <View style={styles.annotationItem}>
            <View style={[styles.annotationDot, { backgroundColor: '#DBEAFE', borderColor: '#1D4ED8' }]} />
            <Text style={[styles.annotationText, { color: '#1D4ED8' }]}>Zone parole</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSymbol: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  legendText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  yLabel: {
    position: 'absolute',
    left: 0,
    width: CHART_PADDING_LEFT - 4,
    fontSize: 10,
    color: Colors.textTertiary,
    textAlign: 'right',
    fontWeight: '500',
  },
  yAxisTitle: {
    position: 'absolute',
    left: 0,
    top: CHART_PADDING_TOP + CHART_HEIGHT / 2 - 20,
    fontSize: 10,
    color: Colors.textTertiary,
    fontWeight: '600',
    transform: [{ rotate: '-90deg' }],
    width: 24,
  },
  xLabel: {
    position: 'absolute',
    width: 36,
    fontSize: 9,
    color: Colors.textTertiary,
    textAlign: 'center',
    fontWeight: '500',
  },
  annotations: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  annotationItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  annotationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  annotationText: { fontSize: 10, fontWeight: '500' },
});
