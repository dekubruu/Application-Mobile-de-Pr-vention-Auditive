import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';

interface StatsGridProps {
  tests: number;
  points: number;
  days: number;
}

const STATS = [
  { key: 'tests', icon: '🎧', label: 'Tests' },
  { key: 'points', icon: '⭐', label: 'Points' },
  { key: 'days', icon: '📅', label: 'Jours' },
] as const;

export const StatsGrid: React.FC<StatsGridProps> = ({ tests, points, days }) => {
  const values = { tests, points, days };

  return (
    <View style={styles.grid}>
      {STATS.map((stat) => (
        <View key={stat.key} style={styles.card}>
          <Text style={styles.icon}>{stat.icon}</Text>
          <Text style={styles.value}>{values[stat.key]}</Text>
          <Text style={styles.label}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 18,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  icon: {
    fontSize: 22,
    marginBottom: 6,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
