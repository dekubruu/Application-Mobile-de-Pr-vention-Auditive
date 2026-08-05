import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { getSoundLevelCategory } from '../constants/sound-level.constants';

const MAX_DB = 120;

interface SoundLevelBarProps {
  soundLevel: number;
}

export const SoundLevelBar: React.FC<SoundLevelBarProps> = ({ soundLevel }) => {
  const category = getSoundLevelCategory(soundLevel);
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pct = Math.min(Math.max(soundLevel / MAX_DB, 0), 1) * 100;
    Animated.timing(widthAnim, {
      toValue: pct,
      duration: 120,
      useNativeDriver: false,
    }).start();
  }, [soundLevel]);

  return (
    <View style={styles.track}>
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: category.color,
            width: widthAnim.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    height: 14,
    backgroundColor: Colors.border,
    borderRadius: 7,
    overflow: 'hidden',
    marginTop: 16,
  },
  fill: {
    height: '100%',
    borderRadius: 7,
  },
});
