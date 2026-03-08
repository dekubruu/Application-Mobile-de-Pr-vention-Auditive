// app/results.tsx
import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Colors } from '../constants/colors';

interface FrequencyResult {
  freq: string;
  status: 'ok' | 'warning';
  label: string;
}

export default function ResultsScreen() {
  const router = useRouter();

  const results: FrequencyResult[] = [
    { freq: '250 Hz', status: 'ok', label: '✓ OK' },
    { freq: '500 Hz', status: 'ok', label: '✓ OK' },
    { freq: '1 kHz', status: 'ok', label: '✓ OK' },
    { freq: '2 kHz', status: 'warning', label: '⚠ À surveiller' },
    { freq: '4 kHz', status: 'warning', label: '⚠ À surveiller' },
    { freq: '8 kHz', status: 'warning', label: '⚠ À surveiller' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>

        <Text style={styles.headerTitle}>Résultats</Text>
        <Text style={styles.shareIcon}>📤</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Result Summary */}
        <Card style={styles.resultSummary}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreValue}>120</Text>
          </View>
          <Text style={styles.resultLabel}>À surveiller</Text>
          <View style={styles.disclaimerBox}>
            <Text style={styles.disclaimerText}>
              ⚠️ Ceci est un outil de dépistage, pas un diagnostic médical.
            </Text>
          </View>
        </Card>

        {/* Frequency Table */}
        <Card>
          <Text style={styles.tableTitle}>Détails par fréquence</Text>
          <View style={styles.frequencyTable}>
            {results.map((result, index) => (
              <View key={index}>
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}>{result.freq}</Text>
                  <View
                    style={[
                      styles.badge,
                      result.status === 'ok'
                        ? styles.badgeSuccess
                        : styles.badgeWarning,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        result.status === 'ok'
                          ? styles.badgeTextSuccess
                          : styles.badgeTextWarning,
                      ]}
                    >
                      {result.label}
                    </Text>
                  </View>
                </View>
                {index < results.length - 1 && (
                  <View style={styles.tableDivider} />
                )}
              </View>
            ))}
          </View>
        </Card>

        {/* Actions */}
        <View style={styles.actionButtons}>
          <View style={{ flex: 1 }}>
            <Button
              title="📋 Refaire"
              variant="primary"
              size="md"
              onPress={() => router.push('/test')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="📚 Conseils"
              variant="secondary"
              size="md"
              onPress={() => router.push('/profile')}
            />
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
  },
  shareIcon: {
    fontSize: 20,
  },
  scrollView: {
    padding: 16,
  },
  resultSummary: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resultLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.warning,
    marginBottom: 16,
  },
  disclaimerBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  disclaimerText: {
    fontSize: 13,
    color: '#991B1B',
    textAlign: 'center',
  },
  tableTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
    color: Colors.text,
  },
  frequencyTable: {
    borderRadius: 8,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  tableCell: {
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
  tableDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
});
