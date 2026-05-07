import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Résultats</Text>
        <Ionicons name="share-outline" size={22} color={Colors.primary} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.summaryCard} elevated>
          <View style={[styles.scoreCircle, { borderColor: Colors.warning }]}>
            <Text style={[styles.scoreValue, { color: Colors.warning }]}>120</Text>
            <Text style={[styles.scoreUnit, { color: Colors.warning }]}>Hz</Text>
          </View>
          <Text style={styles.resultLabel}>À surveiller</Text>

          <View style={styles.disclaimer}>
            <Ionicons name="information-circle-outline" size={16} color="#991B1B" />
            <Text style={styles.disclaimerText}>
              Ceci est un outil de dépistage, pas un diagnostic médical.
            </Text>
          </View>
        </Card>

        <FrequencyTable results={STATIC_RESULTS} />

        <View style={styles.actions}>
          <Button
            title="Refaire le test"
            variant="primary"
            size="md"
            onPress={() => router.push('/test')}
            style={styles.actionBtn}
          />
          <Button
            title="Voir le profil"
            variant="secondary"
            size="md"
            onPress={() => router.push('/profile')}
            style={styles.actionBtn}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  summaryCard: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
  scoreCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -1,
  },
  scoreUnit: {
    fontSize: 15,
    fontWeight: '600',
  },
  resultLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.warning,
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.errorLight,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
  },
});
