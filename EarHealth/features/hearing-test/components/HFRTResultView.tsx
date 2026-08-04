import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { HAUTES_FREQUENCES_INFO } from '../constants/hearing-info';
import { computeAge, interpretForAge } from '../services/HFRTAlgorithm';
import type { HFRTResult } from '../types/hfrt.types';
import { HFRTSpectrumChart } from './HFRTSpectrumChart';
import { InfoTooltip } from './InfoTooltip';

interface HFRTResultViewProps {
  result: HFRTResult;
  dateOfBirth?: string | null;
  /** Age captured at test time. When provided, it takes precedence over the
   *  current age derived from dateOfBirth — so a historical result keeps the
   *  age-relative interpretation it had the day it was taken. */
  ageAtTest?: number | null;
}

export const HFRTResultView: React.FC<HFRTResultViewProps> = ({ result, dateOfBirth, ageAtTest }) => {
  const { maxAudibleFrequency, reliable, durationMs, hitCeiling, noResponse } = result;

  // ── No-response branch: setup problem, not a measurement (not persisted) ──
  if (noResponse) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.iconRing, { backgroundColor: Colors.warningLight }]}>
          <Ionicons name="alert-circle-outline" size={40} color={Colors.warning} />
        </View>
        <Text style={styles.title}>Aucune réponse détectée</Text>
        <Text style={styles.hint}>
          Aucune perception n’a été enregistrée, même à 8 kHz. Ce résultat n’a pas été
          sauvegardé. Vérifiez que le casque est bien branché, que le volume est à mi-course,
          puis refaites le test.
        </Text>
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={13} color={Colors.textTertiary} />
          <Text style={styles.disclaimerText}>
            La perception des hautes fréquences dépend fortement du matériel (écouteurs,
            haut-parleurs) et de l’environnement.
          </Text>
        </View>
      </ScrollView>
    );
  }

  const age    = ageAtTest ?? computeAge(dateOfBirth);
  const interp = interpretForAge(maxAudibleFrequency, age);
  const kHz    = (maxAudibleFrequency / 1000).toFixed(maxAudibleFrequency >= 10_000 ? 1 : 2);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.iconRing}>
        <Ionicons name="pulse" size={40} color={Colors.primary} />
      </View>

      <View style={styles.titleRow}>
        <Text style={[styles.title, styles.titleInRow]}>Limite haute détectée</Text>
        <InfoTooltip content={HAUTES_FREQUENCES_INFO} size={15} />
      </View>

      <View style={styles.bigValueWrap}>
        {hitCeiling && <Text style={styles.bigPrefix}>≥</Text>}
        <Text style={styles.bigValue}>{hitCeiling ? '20' : kHz}</Text>
        <Text style={styles.bigUnit}>kHz</Text>
      </View>

      {hitCeiling && (
        <Text style={styles.ceilingNote}>
          Limite du test atteinte — votre audition aiguë dépasse peut-être 20 kHz.
        </Text>
      )}

      <View style={styles.labelBadge}>
        <Text style={styles.labelBadgeText}>{interp.label.toUpperCase()}</Text>
      </View>

      <Text style={styles.hint}>{interp.hint}</Text>

      {/* Frequency scale + age zones */}
      <View style={styles.chartSection}>
        <Text style={styles.chartTitle}>Votre limite sur l’échelle 8–20 kHz</Text>
        <HFRTSpectrumChart
          maxHz={maxAudibleFrequency}
          hitCeiling={hitCeiling}
          expectedHz={interp.expectedHz}
        />
      </View>

      <View style={styles.metaCard}>
        <MetaRow
          label="Fréquence maximale"
          value={hitCeiling ? '≥ 20 000 Hz (limite du test)' : `${maxAudibleFrequency.toLocaleString()} Hz`}
        />
        {interp.expectedHz != null && (
          <MetaRow label="Moyenne de votre âge" value={`~${interp.expectedHz.toLocaleString()} Hz`} />
        )}
        <MetaRow label="Durée du balayage" value={`${Math.round(durationMs / 1000)}s`} />
        <MetaRow
          label="Fiabilité"
          value={reliable ? 'Bonne' : 'À refaire'}
          valueColor={reliable ? Colors.success : Colors.warning}
        />
      </View>

      <View style={styles.disclaimer}>
        <Ionicons name="information-circle-outline" size={13} color={Colors.textTertiary} />
        <Text style={styles.disclaimerText}>
          Indication non médicale, sur matériel non calibré. La perception des hautes
          fréquences dépend des écouteurs et de l’environnement ; la comparaison à l’âge est
          une moyenne indicative.
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
  titleRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  titleInRow: { marginTop: 0 },
  bigValueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 6,
  },
  bigPrefix: {
    fontSize: 38,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -1,
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
  ceilingNote: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 18,
    lineHeight: 17,
    fontWeight: '500',
  },
  labelBadge: {
    marginTop: 8,
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

  chartSection: {
    width: '100%',
    marginTop: 22,
    gap: 8,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 2,
  },

  metaCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginTop: 18,
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
