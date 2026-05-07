import { useRouter } from 'expo-router';
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/colors';
import { FrequencyTable } from './components/FrequencyTable';
import type { FrequencyResult } from './types/results.types';

const STATIC_RESULTS: FrequencyResult[] = [
  { freq: '250 Hz', status: 'ok', label: '✓ OK' },
  { freq: '500 Hz', status: 'ok', label: '✓ OK' },
  { freq: '1 kHz', status: 'ok', label: '✓ OK' },
  { freq: '2 kHz', status: 'warning', label: '⚠ À surveiller' },
  { freq: '4 kHz', status: 'warning', label: '⚠ À surveiller' },
  { freq: '8 kHz', status: 'warning', label: '⚠ À surveiller' },
];

export default function ResultsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Résultats</Text>
        <Text style={styles.shareIcon}>📤</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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

        <FrequencyTable results={STATIC_RESULTS} />

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
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
});
