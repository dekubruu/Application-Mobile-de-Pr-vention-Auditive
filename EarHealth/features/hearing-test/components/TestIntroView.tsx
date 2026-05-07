import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/colors';

interface TestIntroViewProps {
  audioReady: boolean;
  onStart: () => void;
}

export const TestIntroView: React.FC<TestIntroViewProps> = ({ audioReady, onStart }) => (
  <>
    <View style={styles.centerContainer}>
      <Text style={styles.logoIcon}>🎧</Text>
    </View>

    <Card style={styles.titleCard}>
      <Text style={styles.titleText}>Test Auditif</Text>
    </Card>

    <Card>
      <Text style={styles.specTitle}>Spécifications</Text>
      <View style={styles.specGrid}>
        <View style={styles.specItem}>
          <Text style={styles.specLabel}>Plage de fréquences</Text>
          <Text style={styles.specValue}>250 Hz - 24000 Hz</Text>
        </View>
        <View style={styles.specItem}>
          <Text style={styles.specLabel}>Précision finale</Text>
          <Text style={styles.specValue}>±200 Hz</Text>
        </View>
        <View style={styles.specItem}>
          <Text style={styles.specLabel}>Type de ton</Text>
          <Text style={styles.specValue}>Sinusoïdal</Text>
        </View>
        <View style={styles.specItem}>
          <Text style={styles.specLabel}>Méthode</Text>
          <Text style={styles.specValue}>Recherche Binaire</Text>
        </View>
      </View>
    </Card>

    <Button
      title={audioReady ? 'Démarrer le test' : "Chargement de l'audio..."}
      variant="primary"
      size="lg"
      onPress={onStart}
      style={styles.startButton}
      disabled={!audioReady}
    />
  </>
);

const styles = StyleSheet.create({
  centerContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  logoIcon: {
    fontSize: 80,
  },
  titleCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  specTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: Colors.text,
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  specItem: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  specLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  specValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
  },
  startButton: {
    marginTop: 16,
  },
});
