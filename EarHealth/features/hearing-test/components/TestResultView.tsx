import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/colors';
import { getTestSummary } from '../constants/hearing-test.constants';

interface TestResultViewProps {
  hearingThreshold: number;
  onRetry: () => void;
}

export const TestResultView: React.FC<TestResultViewProps> = ({ hearingThreshold, onRetry }) => {
  const summary = getTestSummary(hearingThreshold);
  const isPositive = summary.status.startsWith('✓');
  const statusColor = isPositive ? Colors.success : Colors.warning;
  const statusBg = isPositive ? Colors.successLight : Colors.warningLight;

  return (
    <>
      <Card style={styles.resultCard} elevated>
        <View style={[styles.scoreCircle, { borderColor: statusColor }]}>
          <Text style={[styles.scoreValue, { color: statusColor }]}>
            {Math.round(hearingThreshold)}
          </Text>
          <Text style={[styles.scoreUnit, { color: statusColor }]}>Hz</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{summary.status}</Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Résumé du test</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Seuil auditif détecté</Text>
          <Text style={[styles.statValue, { color: statusColor }]}>
            {Math.round(hearingThreshold)} Hz
          </Text>
        </View>
        <View style={styles.divider} />
        <Text style={styles.interpretation}>{summary.interpretation}</Text>
      </Card>

      <Button
        title="Refaire le test"
        variant="primary"
        size="lg"
        onPress={onRetry}
        style={styles.cta}
      />
    </>
  );
};

const styles = StyleSheet.create({
  resultCard: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
  scoreCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -1,
  },
  scoreUnit: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 14,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 14,
  },
  interpretation: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  cta: {
    marginTop: 4,
  },
});
