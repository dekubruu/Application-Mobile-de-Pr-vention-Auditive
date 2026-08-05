import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useThemeColors } from '@/features/theme/ThemeContext';
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

interface ExportSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function ExportSheet({ visible, onClose }: ExportSheetProps) {
  const { session, profile } = useAuth();
  const { colors: tierColors } = useThemeColors();

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
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Exporter mes résultats</Text>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sheetLabel}>Quels tests ?</Text>
          {TEST_TYPE_OPTIONS.map(opt => {
            const active = testTypes.has(opt.key);
            return (
              <Pressable
                key={opt.key}
                onPress={() => toggleType(opt.key)}
                style={({ pressed }) => [
                  styles.typeRow,
                  active && { borderColor: tierColors.primary, backgroundColor: tierColors.primaryLight },
                  pressed && styles.typeRowPressed,
                ]}
              >
                <View
                  style={[
                    styles.typeIconRing,
                    { backgroundColor: active ? tierColors.primary : tierColors.primaryLight },
                  ]}
                >
                  <Ionicons name={opt.icon} size={20} color={active ? '#fff' : tierColors.primary} />
                </View>
                <View style={styles.typeText}>
                  <Text style={styles.typeLabel}>{opt.label}</Text>
                  <Text style={styles.typeSub}>{opt.sub}</Text>
                </View>
                <Ionicons
                  name={active ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={active ? tierColors.primary : Colors.textTertiary}
                />
              </Pressable>
            );
          })}

          <Text style={[styles.sheetLabel, styles.periodLabel]}>Sur quelle période ?</Text>
          {PERIOD_OPTIONS.map(opt => {
            const active = periodMode === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setPeriodMode(opt.key)}
                style={({ pressed }) => [
                  styles.typeRow,
                  active && { borderColor: tierColors.primary, backgroundColor: tierColors.primaryLight },
                  pressed && styles.typeRowPressed,
                ]}
              >
                <View
                  style={[
                    styles.typeIconRing,
                    { backgroundColor: active ? tierColors.primary : tierColors.primaryLight },
                  ]}
                >
                  <Ionicons name={opt.icon} size={20} color={active ? '#fff' : tierColors.primary} />
                </View>
                <View style={styles.typeText}>
                  <Text style={styles.typeLabel}>{opt.label}</Text>
                  <Text style={styles.typeSub}>{opt.sub}</Text>
                </View>
                <Ionicons
                  name={active ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={active ? tierColors.primary : Colors.textTertiary}
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

          <Button
            title={generating ? 'Génération…' : 'Générer l’export PDF'}
            variant="primary"
            size="lg"
            onPress={handleGenerate}
            disabled={!canGenerate}
            style={styles.sheetBtn}
          />
          {testTypes.size === 0 && (
            <Text style={styles.warningText}>Sélectionne au moins un type de test.</Text>
          )}
          <Button title="Annuler" variant="ghost" size="md" onPress={onClose} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
    maxHeight: '85%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 20,
  },
  scrollContent: { paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  sheetLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 7,
  },
  periodLabel: { marginTop: 20 },

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
  typeRowPressed: { opacity: 0.9 },
  typeIconRing: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  typeText: { flex: 1 },
  typeLabel: { fontSize: 14, fontWeight: '700', color: Colors.text },
  typeSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  customDates: { marginTop: 12 },

  sheetBtn: { marginTop: 20, marginBottom: 8 },
  warningText: {
    fontSize: 12,
    color: Colors.warning,
    textAlign: 'center',
    marginTop: -4,
    marginBottom: 12,
    fontWeight: '600',
  },
});
