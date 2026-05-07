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
    <View style={styles.table}>
      {results.map((result, index) => (
        <View key={index}>
          <View style={styles.row}>
            <Text style={styles.cell}>{result.freq}</Text>
            <View
              style={[
                styles.badge,
                result.status === 'ok' ? styles.badgeSuccess : styles.badgeWarning,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  result.status === 'ok' ? styles.badgeTextSuccess : styles.badgeTextWarning,
                ]}
              >
                {result.label}
              </Text>
            </View>
          </View>
          {index < results.length - 1 && <View style={styles.divider} />}
        </View>
      ))}
    </View>
  </Card>
);

const styles = StyleSheet.create({
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
    color: Colors.text,
  },
  table: {
    borderRadius: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  cell: {
    fontWeight: '600',
    color: Colors.text,
    fontSize: 14,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeSuccess: {
    backgroundColor: '#D1FAE5',
  },
  badgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeTextSuccess: {
    color: Colors.success,
  },
  badgeTextWarning: {
    color: Colors.warning,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
});
