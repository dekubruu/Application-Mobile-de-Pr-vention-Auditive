import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '@/constants/colors';
import {
  formatFrequency,
  getCategoryColor,
  getHearingCapacityPercent,
  getHearingCategory,
  getTestSummary,
  toDisplayDb,
} from '../constants/hearing-test.constants';
import type { HearingCategory } from '../types/hearing-test.types';
import type { PTTEarResult } from '../types/ptt.types';
import {
  CAPACITE_AUDITIVE_INFO,
  getSeuilLabel,
  PERTE_AUDITIVE_INFO,
  SEUIL_AUDITIF_INFO,
} from '../constants/hearing-info';
import { AudiogramChart } from './AudiogramChart';
import { InfoTooltip } from './InfoTooltip';

const EAR_ACCENT: Record<'left' | 'right', string> = { left: '#2A6BC1', right: '#C0392B' };
const EAR_LABEL:  Record<'left' | 'right', string> = { left: 'Oreille gauche', right: 'Oreille droite' };

// Ordered worst-to-best-scale positions for the severity track (index order
// drives the segment/badge layout, not the category's own thresholds).
const SEVERITY_LEVELS: HearingCategory[] = ['normal', 'mild', 'moderate', 'severe'];
const SEVERITY_CARD_TITLE: Record<HearingCategory, string> = {
  normal:   'Audition normale',
  mild:     'Perte auditive légère',
  moderate: 'Perte auditive modérée',
  severe:   'Perte auditive significative',
};

interface PTTResultViewProps {
  earResults: PTTEarResult[];
  /** Previous PTT test, if any, drawn as a faded/dashed overlay for comparison. */
  previousEarResults?: PTTEarResult[] | null;
}

export const PTTResultView: React.FC<PTTResultViewProps> = ({ earResults, previousEarResults }) => {
  const left  = earResults.find(e => e.ear === 'left');
  const right = earResults.find(e => e.ear === 'right');

  // Global PTA-4: average of both ears
  const allFreqs = [...(left?.thresholds ?? []), ...(right?.thresholds ?? [])];
  const pta4 = allFreqs.length > 0
    ? Math.round(allFreqs.reduce((acc, t) => acc + t.thresholdDb, 0) / allFreqs.length)
    : 0;
  const category = getHearingCategory(pta4);
  const catColor = getCategoryColor(category);
  const summary  = getTestSummary(category);

  // Imbalance between ears (absolute PTA-4 delta)
  const imbalance = left && right ? Math.abs(left.avgDb - right.avgDb) : 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Severity feedback: where the result sits on the WHO-grade scale */}
      <View style={styles.infoCard}>
        <View style={styles.infoCardHeader}>
          <Text style={styles.infoCardTitle}>{SEVERITY_CARD_TITLE[category]}</Text>
          <InfoTooltip content={PERTE_AUDITIVE_INFO} size={15} />
        </View>

        <View style={styles.youRow}>
          {SEVERITY_LEVELS.map(lvl => (
            <View key={lvl} style={styles.youSlot}>
              {lvl === category && (
                <View style={styles.youBadgeWrap}>
                  <View style={[styles.youBadge, { backgroundColor: catColor }]}>
                    <Text style={styles.youBadgeText}>Vous</Text>
                  </View>
                  <View style={[styles.youTriangle, { borderTopColor: catColor }]} />
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={styles.segmentRow}>
          {SEVERITY_LEVELS.map(lvl => (
            <View
              key={lvl}
              style={[styles.segment, { backgroundColor: lvl === category ? catColor : Colors.borderLight }]}
            />
          ))}
        </View>

        <View style={styles.severityEdges}>
          <Text style={styles.severityEdgeText}>Aucune perte</Text>
          <Text style={styles.severityEdgeText}>Perte sévère</Text>
        </View>

        <Text style={styles.severityParagraph}>
          Seuil auditif moyen de {toDisplayDb(pta4)} dB. {summary.interpretation}
        </Text>
      </View>

      {/* Seuil auditif — équivalent en volume de conversation, par oreille */}
      <View style={styles.infoCard}>
        <View style={styles.infoCardHeader}>
          <Text style={styles.infoCardTitle}>Seuil auditif</Text>
          <InfoTooltip content={SEUIL_AUDITIF_INFO} size={15} />
        </View>
        <Text style={styles.infoCardSub}>
          Quel doit être le volume de la conversation pour que vous puissiez l’entendre.
        </Text>
        <View style={styles.earsRow}>
          {left  && <ThresholdColumn ear="left"  db={left.avgDb}  />}
          {right && <ThresholdColumn ear="right" db={right.avgDb} />}
        </View>
      </View>

      {/* Capacité auditive — même seuil, lu en pourcentage */}
      <View style={styles.infoCard}>
        <View style={styles.infoCardHeader}>
          <Text style={styles.infoCardTitle}>Capacité auditive</Text>
          <InfoTooltip content={CAPACITE_AUDITIVE_INFO} size={15} />
        </View>
        <Text style={styles.infoCardSub}>
          Plus le pourcentage est élevé, plus votre capacité auditive est élevée.
        </Text>
        <View style={styles.earsRow}>
          {left  && <CapacityColumn ear="left"  db={left.avgDb}  />}
          {right && <CapacityColumn ear="right" db={right.avgDb} />}
        </View>
      </View>

      {imbalance >= 15 && left && right && (
        <View style={styles.imbalanceBox}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.warning} />
          <Text style={styles.imbalanceText}>
            Différence notable entre les deux oreilles ({imbalance} dB).
            Une asymétrie ≥ 15 dB justifie un avis professionnel.
          </Text>
        </View>
      )}

      {/* Audiogram chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Audiogramme</Text>
        <AudiogramChart earResults={earResults} previousEarResults={previousEarResults} />
        {Platform.OS === 'ios' && (
          <Text style={styles.chartHint}>Pincez pour zoomer sur le graphique.</Text>
        )}
      </View>

      {/* Detailed table */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Détail par fréquence</Text>
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCol, styles.colFreq]}>Fréquence</Text>
            <Text style={[styles.tableCol, styles.colEarHead, { color: '#C0392B' }]}>Droite</Text>
            <Text style={[styles.tableCol, styles.colEarHead, { color: '#2A6BC1' }]}>Gauche</Text>
          </View>
          {(left?.thresholds ?? right?.thresholds ?? []).map((t, i) => {
            const r = right?.thresholds[i];
            const l = left?.thresholds[i];
            return (
              <View key={t.frequency} style={styles.tableRow}>
                <Text style={[styles.tableCol, styles.colFreq, styles.cellFreq]}>
                  {formatFrequency(t.frequency)}
                </Text>
                {r ? <DbCell db={r.thresholdDb} reliable={r.reliable} /> : <Empty />}
                {l ? <DbCell db={l.thresholdDb} reliable={l.reliable} /> : <Empty />}
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.disclaimer}>
        <Ionicons name="information-circle-outline" size={13} color={Colors.textTertiary} />
        <Text style={styles.disclaimerText}>
          Test indicatif sur appareil non calibré. Les valeurs en dB sont relatives.
          Un audiogramme clinique chez un audiologiste reste nécessaire pour un diagnostic.
        </Text>
      </View>
    </ScrollView>
  );
};

// ── Seuil auditif card: dB value + loudness-equivalent label, per ear ────────

const ThresholdColumn: React.FC<{ ear: 'left' | 'right'; db: number }> = ({ ear, db }) => {
  const accent    = EAR_ACCENT[ear];
  const displayDb = toDisplayDb(db);
  const isRight   = ear === 'right';
  return (
    <View style={styles.earCol}>
      <View style={styles.earIconRow}>
        {!isRight && <SoundWaveIcon color={accent} direction="left" />}
        <View style={[styles.earIconRing, { backgroundColor: accent + '18' }]}>
          <Ionicons name="person" size={20} color={accent} />
        </View>
        {isRight && <SoundWaveIcon color={accent} direction="right" />}
      </View>
      <View style={styles.thresholdValueRow}>
        <Text style={styles.thresholdValue}>{displayDb}</Text>
        <Text style={styles.thresholdUnit}>dB</Text>
      </View>
      <Text style={styles.thresholdLabel}>{getSeuilLabel(displayDb)}</Text>
      <Text style={[styles.earColLabel, { color: Colors.textSecondary }]}>{EAR_LABEL[ear]}</Text>
    </View>
  );
};

// Concentric arcs pointing away from the person icon — signals which ear
// (left/right) the reading belongs to, independent of the accent colour.
const SoundWaveIcon: React.FC<{ color: string; direction: 'left' | 'right' }> = ({
  color, direction,
}) => (
  <Ionicons
    name="wifi"
    size={16}
    color={color}
    style={direction === 'left' ? styles.soundWaveLeft : styles.soundWaveRight}
  />
);

// ── Capacité auditive card: same threshold, read as a percentage ring ────────

const RING_SIZE   = 84;
const RING_STROKE = 9;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const CapacityColumn: React.FC<{ ear: 'left' | 'right'; db: number }> = ({ ear, db }) => {
  const accent  = EAR_ACCENT[ear];
  const percent = getHearingCapacityPercent(db);
  const offset  = RING_CIRCUMFERENCE * (1 - percent / 100);

  return (
    <View style={styles.earCol}>
      <View style={styles.ring}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={accent + '20'}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={accent}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
            strokeDashoffset={offset}
            fill="none"
            rotation={-90}
            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text style={[styles.ringPercent, { color: accent }]}>{percent}%</Text>
        </View>
      </View>
      <Text style={[styles.earColLabel, { color: Colors.textSecondary, marginTop: 10 }]}>{EAR_LABEL[ear]}</Text>
    </View>
  );
};

// `db` here is the INTERNAL value; dbColor must keep receiving the internal
// scale (its thresholds 20/40/60 are calibrated against it), only the
// rendered text is offset.
const DbCell: React.FC<{ db: number; reliable: boolean }> = ({ db, reliable }) => (
  <View style={[styles.colEar, styles.cellEar]}>
    <Text style={[styles.cellDb, { color: dbColor(db) }]}>{toDisplayDb(db)}</Text>
    {!reliable && <Text style={styles.cellUnreliable}>~</Text>}
  </View>
);

const Empty: React.FC = () => (
  <View style={[styles.colEar, styles.cellEar]}>
    <Text style={styles.cellDb}>—</Text>
  </View>
);

function dbColor(db: number): string {
  if (db <= 20) return Colors.success;
  if (db <= 40) return Colors.primary;
  if (db <= 60) return Colors.warning;
  return Colors.error;
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, gap: 14 },

  // Seuil auditif / Capacité auditive cards
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  infoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoCardTitle:  { fontSize: 15, fontWeight: '700', color: Colors.text, letterSpacing: -0.2 },
  infoCardSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 18,
  },

  // Severity track ("Vous" badge over a 4-step Aucune perte → Perte sévère scale)
  youRow: { flexDirection: 'row', gap: 4, marginTop: 18 },
  youSlot: { flex: 1, alignItems: 'center' },
  youBadgeWrap: { alignItems: 'center' },
  youBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  youBadgeText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  youTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  segmentRow: { flexDirection: 'row', gap: 4, marginTop: 6 },
  segment: { flex: 1, height: 8, borderRadius: 4 },
  severityEdges: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  severityEdgeText: { fontSize: 11, color: Colors.textTertiary, fontWeight: '600' },
  severityParagraph: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginTop: 16 },

  earsRow: { flexDirection: 'row' },
  earCol:  { flex: 1, alignItems: 'center' },
  earColLabel: { fontSize: 11, fontWeight: '500', letterSpacing: 0.2, marginTop: 4 },

  earIconRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  earIconRing: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  soundWaveLeft:  { opacity: 0.85, transform: [{ rotate: '-90deg' }] },
  soundWaveRight: { opacity: 0.85, transform: [{ rotate: '90deg' }] },
  thresholdValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  thresholdValue: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color: Colors.text },
  thresholdUnit:  { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  thresholdLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500', marginTop: 1 },

  ring: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ringPercent: { fontSize: 19, fontWeight: '800', letterSpacing: -0.5 },

  // Imbalance
  imbalanceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: Colors.warningLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  imbalanceText: { flex: 1, fontSize: 12, color: Colors.warning, lineHeight: 17, fontWeight: '600' },

  // Sections
  section:      { gap: 8, marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginLeft: 2 },
  chartHint: {
    fontSize: 11,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: -2,
  },

  // Detail table
  tableCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  tableCol: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  colFreq:    { flex: 2, textAlign: 'left' },
  colEarHead: { flex: 1, letterSpacing: 0.4 },
  colEar:     { flex: 1 },
  cellFreq:   { fontSize: 13, fontWeight: '600', color: Colors.text },
  cellEar:    { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 2 },
  cellDb:     { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  cellUnreliable: { fontSize: 11, color: Colors.warning, fontWeight: '700' },

  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    marginTop: 8,
  },
  disclaimerText: { flex: 1, fontSize: 11, color: Colors.textTertiary, lineHeight: 16 },
});
