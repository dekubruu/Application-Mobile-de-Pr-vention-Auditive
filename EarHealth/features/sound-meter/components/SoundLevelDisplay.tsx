import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import type { SoundLevelCategory } from '../constants/sound-level.constants';

interface SoundLevelDisplayProps {
  soundLevel: number;
  averageLevel: number;
  category: SoundLevelCategory;
  overRange: boolean;
}

export const SoundLevelDisplay: React.FC<SoundLevelDisplayProps> = ({
  soundLevel,
  averageLevel,
  category,
  overRange,
}) => (
  <View style={styles.container}>
    <Text style={[styles.level, { color: category.color }]}>
      {soundLevel}{overRange ? '+' : ''}
    </Text>
    <Text style={styles.unit}>dB</Text>
    <View style={[styles.badge, { backgroundColor: category.color + '18' }]}>
      <View style={[styles.dot, { backgroundColor: category.color }]} />
      <Text style={[styles.badgeLabel, { color: category.color }]}>{category.label}</Text>
    </View>
    <Text style={styles.average}>Moyenne : {averageLevel} dB</Text>
    {overRange && (
      <Text style={styles.overRange}>Niveau au-delà de la plage mesurable</Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  level: {
    fontSize: 80,
    fontWeight: '800',
    letterSpacing: -3,
    lineHeight: 88,
  },
  unit: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: -4,
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  average: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  overRange: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
});
