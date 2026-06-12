import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/colors';
import { SOUND_LEVEL_GUIDE } from '../constants/sound-level.constants';

export const SoundLevelGuide: React.FC = () => (
  <Card>
    <Text style={styles.title}>Guide des niveaux sonores</Text>
    {SOUND_LEVEL_GUIDE.map((entry, index) => (
      <View key={index} style={[styles.row, index < SOUND_LEVEL_GUIDE.length - 1 && styles.rowBorder]}>
        <View style={[styles.dot, { backgroundColor: entry.color }]} />
        <Text style={styles.text}>{entry.text}</Text>
      </View>
    ))}
    <Text style={styles.disclaimer}>
      Mesure large bande non pondérée, à titre indicatif. Les seuils de référence
      (85 dB, etc.) sont exprimés en dB(A).
    </Text>
  </Card>
);

const styles = StyleSheet.create({
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 14,
    letterSpacing: -0.1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 9,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 3,
    flexShrink: 0,
  },
  text: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  disclaimer: {
    fontSize: 11,
    color: Colors.textTertiary,
    lineHeight: 16,
    marginTop: 14,
    fontStyle: 'italic',
  },
});
