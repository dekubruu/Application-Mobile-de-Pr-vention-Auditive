import React from 'react';
import { StyleSheet, View } from 'react-native';
import { getSoundLevelCategory } from '../constants/sound-level.constants';

interface SoundLevelBarProps {
  soundLevel: number;
}

export const SoundLevelBar: React.FC<SoundLevelBarProps> = ({ soundLevel }) => {
  const category = getSoundLevelCategory(soundLevel);
  const barWidth = Math.min(soundLevel, 100);

  return (
    <View style={styles.indicator}>
      <View
        style={[styles.bar, { width: barWidth, backgroundColor: category.color }]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  indicator: {
    width: '100%',
    height: 30,
    backgroundColor: '#E5E7EB',
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 40,
  },
  bar: {
    height: '100%',
  },
});
