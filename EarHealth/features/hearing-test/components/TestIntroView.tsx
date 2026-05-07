import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/colors';

interface TestIntroViewProps {
  audioReady: boolean;
  onStart: () => void;
}

const SPECS = [
  { label: 'Plage de fréquences', value: '250 Hz – 24 kHz' },
  { label: 'Précision finale', value: '±200 Hz' },
  { label: 'Type de ton', value: 'Sinusoïdal' },
  { label: 'Méthode', value: 'Recherche Binaire' },
];

export const TestIntroView: React.FC<TestIntroViewProps> = ({ audioReady, onStart }) => (
  <>
    <View style={styles.hero}>
      <View style={styles.iconRing}>
        <Ionicons name="ear" size={52} color={Colors.primary} />
      </View>
      <Text style={styles.heroTitle}>Test Auditif</Text>
      <Text style={styles.heroSubtitle}>
        Mesurez votre seuil auditif en quelques minutes grâce à la recherche binaire.
      </Text>
    </View>

    <Card>
      <Text style={styles.sectionLabel}>Spécifications</Text>
      <View style={styles.specGrid}>
        {SPECS.map((spec) => (
          <View key={spec.label} style={styles.specItem}>
            <Text style={styles.specValue}>{spec.value}</Text>
            <Text style={styles.specLabel}>{spec.label}</Text>
          </View>
        ))}
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

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  iconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  specItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.primaryLight,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  specValue: {
    fontSize: 14,
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
  cta: {
    marginTop: 8,
  },
});
