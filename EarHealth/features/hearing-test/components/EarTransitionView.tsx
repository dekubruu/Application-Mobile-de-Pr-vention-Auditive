import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/colors';
import {
  getCategoryBg,
  getCategoryColor,
  getCategoryLabel,
  getHearingCategory,
} from '../constants/hearing-test.constants';
import type { FrequencyThreshold } from '../types/hearing-test.types';

interface EarTransitionViewProps {
  leftEarResults: FrequencyThreshold[];
  onContinue:     () => void;
}

function avgDb(results: FrequencyThreshold[]): number {
  if (!results.length) return 0;
  return Math.round(results.reduce((s, r) => s + r.dbLevel, 0) / results.length);
}

export const EarTransitionView: React.FC<EarTransitionViewProps> = ({
  leftEarResults,
  onContinue,
}) => {
  const avg      = avgDb(leftEarResults);
  const category = getHearingCategory(avg);
  const color    = getCategoryColor(category);
  const bg       = getCategoryBg(category);
  const catLabel = getCategoryLabel(category);
  const sorted   = [...leftEarResults].sort((a, b) => a.frequency - b.frequency);

  return (
    <>
      {/* Left ear result */}
      <Card style={styles.resultCard} elevated>
        <View style={styles.resultHeader}>
          <View style={styles.earBadge}>
            <Ionicons name="arrow-back" size={13} color={Colors.primary} />
            <Text style={styles.earBadgeText}>OREILLE GAUCHE</Text>
          </View>
          <View style={[styles.doneBadge, { backgroundColor: bg }]}>
            <Ionicons name="checkmark-circle" size={14} color={color} />
            <Text style={[styles.doneBadgeText, { color }]}>Terminé</Text>
          </View>
        </View>

        <View style={styles.dbRow}>
          <Text style={[styles.dbValue, { color }]}>{avg}</Text>
          <Text style={styles.dbUnit}> dB moy.</Text>
        </View>
        <View style={[styles.catBadge, { backgroundColor: bg }]}>
          <Text style={[styles.catBadgeText, { color }]}>{catLabel}</Text>
        </View>

        {/* Per-frequency mini bars */}
        <View style={styles.freqBars}>
          {sorted.map(r => {
            const pct = Math.min(1, r.dbLevel / 80);
            const barColor = getCategoryColor(getHearingCategory(r.dbLevel));
            return (
              <View key={r.frequency} style={styles.freqBarWrap}>
                <View style={styles.freqBarTrack}>
                  <View style={[styles.freqBarFill, { height: `${pct * 100}%`, backgroundColor: barColor }]} />
                </View>
                <Text style={styles.freqBarLabel}>
                  {r.frequency >= 1000 ? `${r.frequency / 1000}k` : String(r.frequency)}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Ionicons name="swap-horizontal" size={20} color={Colors.textTertiary} />
        <View style={styles.dividerLine} />
      </View>

      {/* Right ear intro */}
      <Card style={styles.nextCard}>
        <View style={styles.nextBadge}>
          <Text style={styles.earBadgeText}>OREILLE DROITE</Text>
          <Ionicons name="arrow-forward" size={13} color={Colors.primary} />
        </View>
        <Text style={styles.nextTitle}>Test de l'oreille droite</Text>
        <Text style={styles.nextDesc}>
          Même procédure pour l'oreille droite. Le volume s'adapte automatiquement — répondez simplement si vous entendez le son ou non.
        </Text>
        <View style={styles.tipRow}>
          <Ionicons name="bulb-outline" size={16} color={Colors.textTertiary} />
          <Text style={styles.tipText}>
            Conseil : restez dans un endroit calme et gardez le volume de votre appareil constant.
          </Text>
        </View>
      </Card>

      <Button
        title="Tester l'oreille droite"
        variant="primary"
        size="lg"
        onPress={onContinue}
        style={styles.cta}
      />
    </>
  );
};

const styles = StyleSheet.create({
  resultCard:   { paddingVertical: 20, alignItems: 'center' },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 14,
  },
  earBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  earBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.primary, letterSpacing: 0.5 },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  doneBadgeText: { fontSize: 12, fontWeight: '600' },
  dbRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8 },
  dbValue: { fontSize: 52, fontWeight: '700', letterSpacing: -1 },
  dbUnit:  { fontSize: 18, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  catBadge: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 16 },
  catBadgeText: { fontSize: 14, fontWeight: '700' },

  freqBars: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
    height: 50,
    width: '100%',
    justifyContent: 'center',
  },
  freqBarWrap: { alignItems: 'center', gap: 4 },
  freqBarTrack: {
    width: 18,
    height: 40,
    backgroundColor: Colors.borderLight,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  freqBarFill:  { width: '100%', borderRadius: 4 },
  freqBarLabel: { fontSize: 9, color: Colors.textTertiary, fontWeight: '600', textAlign: 'center' },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.borderLight },

  nextCard: { paddingVertical: 20 },
  nextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  nextTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  nextDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
    marginBottom: 12,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10,
    padding: 12,
  },
  tipText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  cta: { marginTop: 4 },
});
