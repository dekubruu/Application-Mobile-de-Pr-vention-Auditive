import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { interpretMaxFrequency } from '../services/HFRTAlgorithm';
import type { HFRTResult } from '../types/hfrt.types';

interface HFRTResultViewProps {
  result: HFRTResult;
}

export const HFRTResultView: React.FC<HFRTResultViewProps> = ({ result }) => {
  const { maxAudibleFrequency, reliable, durationMs, reversals } = result;
  const { label, hint } = interpretMaxFrequency(maxAudibleFrequency);
  const kHz   = (maxAudibleFrequency / 1000).toFixed(maxAudibleFrequency >= 10_000 ? 1 : 2);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.iconRing}>
        <Ionicons name="pulse" size={40} color={Colors.primary} />
      </View>

      <Text style={styles.title}>Limite haute détectée</Text>

      <View style={styles.bigValueWrap}>
        <Text style={styles.bigValue}>{kHz}</Text>
        <Text style={styles.bigUnit}>kHz</Text>
      </View>

      <View style={styles.labelBadge}>
        <Text style={styles.labelBadgeText}>{label.toUpperCase()}</Text>
      </View>

      <Text style={styles.hint}>{hint}</Text>

      <View style={styles.metaCard}>
        <MetaRow label="Fréquence maximale" value={`${maxAudibleFrequency.toLocaleString()} Hz`} />
        <MetaRow label="Inversions détectées" value={String(reversals.length)} />
        <MetaRow label="Durée" value={`${Math.round(durationMs / 1000)}s`} />
        <MetaRow label="Fiabilité" value={reliable ? 'Bonne' : 'À refaire'} valueColor={reliable ? Colors.success : Colors.warning} />
      </View>

      <View style={styles.disclaimer}>
        <Ionicons name="information-circle-outline" size={13} color={Colors.textTertiary} />
        <Text style={styles.disclaimerText}>
          Indication non médicale. La perception des hautes fréquences dépend du matériel
          (écouteurs, haut-parleurs) et de l’environnement.
        </Text>
      </View>
    </ScrollView>
  );
};

const MetaRow: React.FC<{ label: string; value: string; valueColor?: string }> = ({
  label, value, valueColor,
}) => (
  <View style={styles.metaRow}>
    <Text style={styles.metaLabel}>{label}</Text>
    <Text style={[styles.metaValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, alignItems: 'center' },

  iconRing: {
    width: 78, height: 78,
    borderRadius: 39,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: -0.2,
    marginTop: 14,
  },
  bigValueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 6,
  },
  bigValue: {
    fontSize: 76,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -3,
    lineHeight: 80,
  },
  bigUnit: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
  },
  labelBadge: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
  },
  labelBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primaryDark,
    letterSpacing: 0.5,
  },
  hint: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 18,
    lineHeight: 19,
  },

  metaCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginTop: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 2,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  metaLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  metaValue: { fontSize: 13, color: Colors.text, fontWeight: '700' },

  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    marginTop: 14,
  },
  disclaimerText: { flex: 1, fontSize: 11, color: Colors.textTertiary, lineHeight: 16 },
});
