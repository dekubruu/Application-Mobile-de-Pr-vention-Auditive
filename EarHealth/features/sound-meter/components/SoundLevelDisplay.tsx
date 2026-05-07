import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Colors } from '@/constants/colors';
import type { SoundLevelCategory } from '../constants/sound-level.constants';

interface SoundLevelDisplayProps {
  soundLevel: number;
  averageLevel: number;
  category: SoundLevelCategory;
}

export const SoundLevelDisplay: React.FC<SoundLevelDisplayProps> = ({
  soundLevel,
  averageLevel,
  category,
}) => (
  <>
    <Text style={styles.level}>{soundLevel} dB</Text>
    <Text style={styles.subTitle}>{category.label}</Text>
    <Text style={styles.average}>Moyenne: {averageLevel} dB</Text>
  </>
);

const styles = StyleSheet.create({
  level: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 30,
  },
  subTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  average: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 18,
  },
});
