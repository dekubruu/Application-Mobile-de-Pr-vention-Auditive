import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import {
  formatFrequency,
  getCategoryBg,
  getCategoryColor,
  getCategoryLabel,
  getHearingCategory,
} from '../constants/hearing-test.constants';
import type { PTTEarResult } from '../types/ptt.types';
import { AudiogramChart } from './AudiogramChart';

interface PTTResultViewProps {
  earResults: PTTEarResult[];
}

export const PTTResultView: React.FC<PTTResultViewProps> = ({ earResults }) => {
  const left  = earResults.find(e => e.ear === 'left');
  const right = earResults.find(e => e.ear === 'right');

  // Global PTA-4: average of both ears
  const allFreqs = [...(left?.thresholds ?? []), ...(right?.thresholds ?? [])];
  const pta4 = allFreqs.length > 0
    ? Math.round(allFreqs.reduce((acc, t) => acc + t.thresholdDb, 0) / allFreqs.length)
    : 0;
  const category = getHearingCategory(pta4);
  const catColor = getCategoryColor(category);
  const catBg    = getCategoryBg(category);
  const catLabel = getCategoryLabel(category);

  // Imbalance between ears (absolute PTA-4 delta)
  const imbalance = left && right ? Math.abs(left.avgDb - right.avgDb) : 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Hero: PTA-4 + WHO grade */}
      <View style={[styles.heroCard, { borderColor: catColor + '40' }]}>
        <Text style={styles.heroEyebrow}>PTA-4 (500–4000 Hz)</Text>
        <View style={styles.heroValueRow}>
          <Text style={[styles.heroValue, { color: catColor }]}>{pta4}</Text>
          <Text style={styles.heroUnit}>dB</Text>
        </View>
        <View style={[styles.gradeBadge, { backgroundColor: catBg }]}>
          <View style={[styles.gradeDot, { backgroundColor: catColor }]} />
          <Text style={[styles.gradeText, { color: catColor }]}>{catLabel}</Text>
        </View>
        <Text style={styles.heroSub}>
          Moyenne tonale (méthode WHO) sur les 4 fréquences testées par oreille.
        </Text>
      </View>

      {/* Per-ear summary row */}
      <View style={styles.earsRow}>
        {left  && <EarSummary ear="left"  result={left}  />}
        {right && <EarSummary ear="right" result={right} />}
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
        <AudiogramChart earResults={earResults} />
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

const EarSummary: React.FC<{ ear: 'left' | 'right'; result: PTTEarResult }> = ({
  ear, result,
}) => {
  const isRight = ear === 'right';
  const accent  = isRight ? '#C0392B' : '#2A6BC1';
  return (
    <View style={[styles.earCard, { borderColor: accent + '33' }]}>
      <View style={styles.earHeader}>
        <View style={[styles.earDotMarker, { backgroundColor: accent }]} />
        <Text style={styles.earTitle}>{isRight ? 'Oreille droite' : 'Oreille gauche'}</Text>
      </View>
      <Text style={[styles.earDb, { color: accent }]}>{result.avgDb}</Text>
      <Text style={styles.earUnit}>dB moyen</Text>
    </View>
  );
};

const DbCell: React.FC<{ db: number; reliable: boolean }> = ({ db, reliable }) => (
  <View style={[styles.colEar, styles.cellEar]}>
    <Text style={[styles.cellDb, { color: dbColor(db) }]}>{db}</Text>
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

  // Hero PTA-4
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textTertiary,
    letterSpacing: 1.2,
  },
  heroValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 6 },
  heroValue: {
    fontSize: 68,
    fontWeight: '800',
    letterSpacing: -3,
    lineHeight: 72,
  },
  heroUnit:  { fontSize: 20, fontWeight: '700', color: Colors.textSecondary },
  gradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  gradeDot:  { width: 8, height: 8, borderRadius: 4 },
  gradeText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  heroSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 8,
    lineHeight: 17,
  },

  // Ear summary cards
  earsRow: { flexDirection: 'row', gap: 10 },
  earCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  earHeader:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  earDotMarker: { width: 8, height: 8, borderRadius: 4 },
  earTitle:     { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.3 },
  earDb:        { fontSize: 32, fontWeight: '800', letterSpacing: -1, lineHeight: 36 },
  earUnit:      { fontSize: 10, color: Colors.textTertiary, fontWeight: '600', letterSpacing: 0.4, marginTop: -2 },

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
