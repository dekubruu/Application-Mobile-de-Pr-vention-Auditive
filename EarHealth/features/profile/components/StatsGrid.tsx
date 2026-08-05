import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { useThemeColors } from '@/features/theme/ThemeContext';

interface StatsGridProps {
  hearingTests: number;
  quizSessions: number;
  points:       number;
}

const STATS = [
  { key: 'hearingTests', icon: 'ear'             as const, label: 'Tests auditifs' },
  { key: 'quizSessions', icon: 'game-controller'  as const, label: 'Quiz' },
  { key: 'points',       icon: 'star'             as const, label: 'Points actuel' },
];

export const StatsGrid: React.FC<StatsGridProps> = ({ hearingTests, quizSessions, points }) => {
  const { colors: tierColors } = useThemeColors();
  const values: Record<string, number> = { hearingTests, quizSessions, points };

  return (
    <View style={styles.grid}>
      {STATS.map((stat) => (
        <View key={stat.key} style={styles.card}>
          <View style={[styles.iconRing, { backgroundColor: tierColors.primaryLight }]}>
            <Ionicons name={stat.icon} size={18} color={tierColors.primary} />
          </View>
          <Text style={[styles.value, { color: tierColors.primary }]}>{values[stat.key]}</Text>
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
    paddingVertical: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  iconRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
});
