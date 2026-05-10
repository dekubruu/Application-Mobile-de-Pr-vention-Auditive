import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/colors';
import type { TestMode } from '../types/hearing-test.types';

interface TestIntroViewProps {
  audioReady: boolean;
  testMode:   TestMode;
  onStart:    () => void;
}

const HEADSET_STEPS = [
  { icon: 'ear-outline'              as const, label: 'Oreille gauche — 6 fréquences (250 Hz – 8 kHz)' },
  { icon: 'swap-horizontal-outline'  as const, label: 'Oreille droite — même protocole adaptatif' },
  { icon: 'analytics-outline'        as const, label: 'Audiogramme binaural détaillé par oreille' },
  { icon: 'checkmark-circle-outline' as const, label: 'Score auditif + interprétation + alerte HF' },
];

const SPEAKER_STEPS = [
  { icon: 'volume-medium-outline'    as const, label: 'Son diffusé par le haut-parleur' },
  { icon: 'hand-left-outline'        as const, label: 'Indiquez si vous entendez ou non' },
  { icon: 'analytics-outline'        as const, label: 'Seuil global sur 6 fréquences' },
];

export const TestIntroView: React.FC<TestIntroViewProps> = ({ audioReady, testMode, onStart }) => {
  const isHeadset = testMode === 'headset';
  const steps     = isHeadset ? HEADSET_STEPS : SPEAKER_STEPS;

  return (
    <>
      <View style={styles.hero}>
        <View style={styles.iconRing}>
          <Ionicons
            name={isHeadset ? 'headset' : 'volume-medium'}
            size={52}
            color={Colors.primary}
          />
        </View>
        <Text style={styles.heroTitle}>
          {isHeadset ? 'Oreille gauche en premier' : 'Test haut-parleur'}
        </Text>
        <Text style={styles.heroSubtitle}>
          {isHeadset
            ? "Le volume s'ajuste automatiquement pour trouver votre seuil d'audition précis à chaque fréquence. Répondez honnêtement — même les sons très faibles comptent."
            : "Test global sans isolation L/R. Indiquez si vous entendez chaque son — le volume s'adapte automatiquement."}
        </Text>
      </View>

      {isHeadset && (
        <Card style={styles.earCard}>
          <View style={styles.earRow}>
            <View style={styles.earLeft}>
              <Ionicons name="arrow-back" size={16} color={Colors.primary} />
              <Text style={styles.earLabel}>GAUCHE D'ABORD</Text>
            </View>
            <Text style={styles.earHint}>puis oreille droite →</Text>
          </View>
        </Card>
      )}

      <Card>
        <Text style={styles.sectionLabel}>Déroulement</Text>
        {steps.map((step) => (
          <View key={step.label} style={styles.stepRow}>
            <View style={styles.stepIcon}>
              <Ionicons name={step.icon} size={18} color={Colors.primary} />
            </View>
            <Text style={styles.stepText}>{step.label}</Text>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={styles.sectionLabel}>Spécifications</Text>
        <View style={styles.specGrid}>
          {[
            { value: '6 fréquences',                 label: 'Par oreille' },
            { value: 'Adaptatif H-W',                label: 'Algorithme' },
            { value: 'Sinusoïdal pur',               label: 'Type de son' },
            { value: isHeadset ? 'Binaural' : 'Mono', label: 'Mode audio' },
          ].map((spec) => (
            <View key={spec.label} style={styles.specItem}>
              <Text style={styles.specValue}>{spec.value}</Text>
              <Text style={styles.specLabel}>{spec.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      {!isHeadset && (
        <Card style={styles.warningCard}>
          <View style={styles.warningRow}>
            <Ionicons name="alert-circle" size={18} color={Colors.warning} />
            <Text style={styles.warningText}>
              Sans écouteurs, l'isolation L/R est impossible. Les résultats sont indicatifs uniquement.
            </Text>
          </View>
        </Card>
      )}

      <Card style={styles.tipCard}>
        <View style={styles.tipRow}>
          <Ionicons name="bulb-outline" size={16} color={Colors.primary} />
          <Text style={styles.tipText}>
            Conseil : répondez dès que vous percevez le son, même très faiblement. Ne répondez pas si vous n'entendez rien.
          </Text>
        </View>
      </Card>

      <Button
        title={audioReady ? 'Démarrer le test' : "Préparation de l'audio…"}
        variant="primary"
        size="lg"
        onPress={onStart}
        style={styles.cta}
        disabled={!audioReady}
      />
    </>
  );
};

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.4,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 4,
  },
  earCard: { backgroundColor: Colors.primaryLight, marginBottom: 4 },
  earRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  earLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  earLabel: { fontSize: 12, fontWeight: '800', color: Colors.primary, letterSpacing: 0.5 },
  earHint:  { fontSize: 12, color: Colors.primaryDark, fontWeight: '500' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  stepIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  specGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  specItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.primaryLight,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  specValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 3,
  },
  specLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  warningCard: {
    backgroundColor: Colors.warningLight,
    borderColor: Colors.warning,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: Colors.warning,
    lineHeight: 19,
    fontWeight: '500',
  },
  tipCard: { backgroundColor: Colors.primaryLight },
  tipRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tipText: { flex: 1, fontSize: 13, color: Colors.primaryDark, lineHeight: 19 },
  cta: { marginTop: 4 },
});
