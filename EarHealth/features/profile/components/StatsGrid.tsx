import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/colors';

interface StatsGridProps {
  tests: number;
  points: number;
  days: number;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ tests, points, days }) => (
  <View style={styles.grid}>
    <StatCard value={tests} label="Tests" />
    <StatCard value={points} label="Points" />
    <StatCard value={days} label="Jours" />
  </View>
);

const StatCard: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <Card style={styles.card}>
    <Text style={styles.value}>{value}</Text>
    <Text style={styles.label}>{label}</Text>
  </Card>
);

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  card: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
