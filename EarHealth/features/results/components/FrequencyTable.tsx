import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/colors';
import type { FrequencyResult } from '../types/results.types';

interface FrequencyTableProps {
  results: FrequencyResult[];
}

export const FrequencyTable: React.FC<FrequencyTableProps> = ({ results }) => (
  <Card>
    <Text style={styles.title}>Détails par fréquence</Text>
    {results.map((result, index) => (
      <View key={index}>
        <View style={styles.row}>
          <Text style={styles.freq}>{result.freq}</Text>
          <View style={[styles.badge, result.status === 'ok' ? styles.badgeOk : styles.badgeWarn]}>
            <Text style={[styles.badgeText, result.status === 'ok' ? styles.textOk : styles.textWarn]}>
              {result.label}
            </Text>
          </View>
        </View>
        {index < results.length - 1 && <View style={styles.divider} />}
      </View>
    ))}
  </Card>
);

const styles = StyleSheet.create({
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 14,
    letterSpacing: -0.1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
  },
  freq: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeOk: { backgroundColor: Colors.successLight },
  badgeWarn: { backgroundColor: Colors.warningLight },
  badgeText: { fontSize: 12, fontWeight: '600' },
  textOk: { color: Colors.success },
  textWarn: { color: Colors.warning },
});
