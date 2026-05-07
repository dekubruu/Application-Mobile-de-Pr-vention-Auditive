import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/colors';

interface TestResultViewProps {
  hearingThreshold: number;
  onRetry: () => void;
}

export const TestResultView: React.FC<TestResultViewProps> = ({
  hearingThreshold,
  onRetry,
}) => (
    <>
      <Card style={styles.scoreCard}>
        <View style={styles.scoreCircle}>
          <Text style={styles.scoreValue}>{Math.round(hearingThreshold)}</Text>
          <Text style={styles.scoreUnit}>Hz</Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Résumé du test</Text>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Seuil auditif détecté:</Text>
          <Text style={styles.statValue}>{Math.round(hearingThreshold)} Hz</Text>
        </View>
      </Card>

      <View style={styles.actions}>
        <Button
          title="Refaire le test"
          variant="primary"
          size="lg"
          onPress={onRetry}
          style={{ marginBottom: 12 }}
        />
      </View>
    </>
);

const styles = StyleSheet.create({
  scoreCard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  scoreCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scoreUnit: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: Colors.text,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  actions: {
    marginTop: 16,
  },
});
