import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { DateField } from '@/components/DateField';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { HearingTestType } from '@/features/hearing-test/services/hearing.storage';
import { exportHearingResultsPdf } from './services/pdfExport.service';

interface TestTypeOption {
  key:   HearingTestType;
  icon:  React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  sub:   string;
}

const TEST_TYPE_OPTIONS: TestTypeOption[] = [
  { key: 'ptt',  icon: 'ear',   label: 'Seuil auditif',    sub: 'Résultats du test du seuil auditif' },
  { key: 'hfrt', icon: 'pulse', label: 'Hautes fréquences', sub: 'Résultats du test haute fréquence' },
];

type PeriodMode = 'all' | 'custom';

interface PeriodOption {
  key:   PeriodMode;
  icon:  React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  sub:   string;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { key: 'all',    icon: 'infinite-outline', label: 'Toute la période',      sub: "Exporter tout l'historique disponible" },
  { key: 'custom', icon: 'calendar-outline', label: 'Période personnalisée', sub: 'Choisir une date de début et de fin' },
];

export default function ExportScreen() {
  const { session, profile } = useAuth();

  const [testTypes, setTestTypes] = useState<Set<HearingTestType>>(new Set(['ptt', 'hfrt']));
  const [periodMode, setPeriodMode]   = useState<PeriodMode>('all');
  const [startDate, setStartDate]     = useState<Date>(new Date());
  const [startTouched, setStartTouched] = useState(false);
  const [endDate, setEndDate]         = useState<Date>(new Date());
  const [endTouched, setEndTouched]   = useState(false);
  const [generating, setGenerating]   = useState(false);

  const toggleType = (key: HearingTestType) => {
    setTestTypes(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const canGenerate = testTypes.size > 0 && !generating;

  const handleGenerate = async () => {
    if (!session || testTypes.size === 0) return;
    setGenerating(true);
    try {
      const result = await exportHearingResultsPdf(
        session.user.id,
        profile?.username ?? 'Utilisateur',
        {
          testTypes: Array.from(testTypes),
          startDate: periodMode === 'custom' && startTouched ? startDate : null,
          endDate:   periodMode === 'custom' && endTouched ? endDate : null,
        },
      );
      if (result.status === 'empty') {
        Alert.alert('Aucun résultat', "Aucun test ne correspond à cette sélection et cette période.");
      } else if (result.status === 'unavailable') {
        Alert.alert('Partage indisponible', "Le partage n'est pas disponible sur cet appareil.");
      }
    } catch {
      Alert.alert('Erreur', "Impossible de générer l'export, vérifiez votre connexion.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace('/(tabs)/profile' as any)} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Exporter mes résultats</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Quels tests ?</Text>
          {TEST_TYPE_OPTIONS.map(opt => {
            const active = testTypes.has(opt.key);
            return (
              <Pressable
                key={opt.key}
                onPress={() => toggleType(opt.key)}
                style={({ pressed }) => [styles.typeRow, active && styles.typeRowActive, pressed && styles.typeRowPressed]}
              >
                <View style={[styles.typeIconRing, active && styles.typeIconRingActive]}>
                  <Ionicons name={opt.icon} size={20} color={active ? '#fff' : Colors.primary} />
                </View>
                <View style={styles.typeText}>
                  <Text style={styles.typeLabel}>{opt.label}</Text>
                  <Text style={styles.typeSub}>{opt.sub}</Text>
                </View>
                <Ionicons
                  name={active ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={active ? Colors.primary : Colors.textTertiary}
                />
              </Pressable>
            );
          })}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Sur quelle période ?</Text>
          {PERIOD_OPTIONS.map(opt => {
            const active = periodMode === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setPeriodMode(opt.key)}
                style={({ pressed }) => [styles.typeRow, active && styles.typeRowActive, pressed && styles.typeRowPressed]}
              >
                <View style={[styles.typeIconRing, active && styles.typeIconRingActive]}>
                  <Ionicons name={opt.icon} size={20} color={active ? '#fff' : Colors.primary} />
                </View>
                <View style={styles.typeText}>
                  <Text style={styles.typeLabel}>{opt.label}</Text>
                  <Text style={styles.typeSub}>{opt.sub}</Text>
                </View>
                <Ionicons
                  name={active ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={active ? Colors.primary : Colors.textTertiary}
                />
              </Pressable>
            );
          })}

          {periodMode === 'custom' && (
            <View style={styles.customDates}>
              <DateField
                label="Date de début"
                value={startDate}
                onChange={(d) => { setStartDate(d); setStartTouched(true); }}
                maximumDate={endTouched ? endDate : new Date()}
              />
              <DateField
                label="Date de fin"
                value={endDate}
                onChange={(d) => { setEndDate(d); setEndTouched(true); }}
                maximumDate={new Date()}
              />
            </View>
          )}
        </Card>

        <Pressable
          onPress={handleGenerate}
          disabled={!canGenerate}
          style={({ pressed }) => [
            styles.generateBtn,
            !canGenerate && styles.generateBtnDisabled,
            pressed && canGenerate && styles.generateBtnPressed,
          ]}
        >
          {generating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="download-outline" size={18} color="#fff" />
              <Text style={styles.generateBtnText}>Générer l’export PDF</Text>
            </>
          )}
        </Pressable>
        {testTypes.size === 0 && (
          <Text style={styles.warningText}>Sélectionne au moins un type de test.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 38, height: 38,
    borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surfaceSecondary,
  },
  headerSpacer: { width: 38, height: 38 },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 16, fontWeight: '700',
    color: Colors.text, letterSpacing: -0.2,
  },

  content: { padding: 16, paddingBottom: 48 },

  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4 },

  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginTop: 8,
  },
  typeRowActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  typeRowPressed: { opacity: 0.9 },
  typeIconRing: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  typeIconRingActive: { backgroundColor: Colors.primary },
  typeText: { flex: 1 },
  typeLabel: { fontSize: 14, fontWeight: '700', color: Colors.text },
  typeSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  customDates: { marginTop: 12 },

  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
  },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnPressed: { opacity: 0.9 },
  generateBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  warningText: {
    fontSize: 12,
    color: Colors.warning,
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '600',
  },
});
