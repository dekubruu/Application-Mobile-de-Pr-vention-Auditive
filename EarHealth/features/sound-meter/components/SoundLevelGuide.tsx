import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { SOUND_LEVEL_GUIDE } from '../constants/sound-level.constants';

export const SoundLevelGuide: React.FC = () => (
  <View style={styles.card}>
    <Text style={styles.title}>Guide des niveaux sonores</Text>
    {SOUND_LEVEL_GUIDE.map((entry, index) => (
      <View key={index} style={styles.row}>
        <View style={[styles.dot, { backgroundColor: entry.color }]} />
        <Text style={styles.text}>{entry.text}</Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  text: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
