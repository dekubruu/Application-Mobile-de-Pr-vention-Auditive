import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/colors';

interface QuizProgressBarProps {
  current: number;
  total: number;
}

export const QuizProgressBar: React.FC<QuizProgressBarProps> = ({ current, total }) => (
  <Card>
    <View style={styles.container}>
      <Text style={styles.text}>
        Question {current} / {total}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${(current / total) * 100}%` }]} />
      </View>
    </View>
  </Card>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: Colors.text,
  },
  track: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
});
