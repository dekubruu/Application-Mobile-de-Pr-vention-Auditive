import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { EvolutionChart, type EvolutionPoint } from './components/EvolutionChart';
import { toDisplayDb } from './constants/hearing-test.constants';
import { useTestHistory, type HistoryEntry, type HistoryFilter } from './hooks/useTestHistory';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now  = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Hier';
  if (diff < 7)  return `Il y a ${diff} jours`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function testLabel(e: HistoryEntry): string {
  return e.testType === 'ptt' ? 'Seuil auditif' : 'Hautes fréquences';
}

function resultLabel(e: HistoryEntry): string {
  if (e.testType === 'ptt') {
    return e.ptaDb != null ? `${toDisplayDb(e.ptaDb)} dB` : '—';
  }
  return e.maxFrequencyHz != null
    ? `${e.hitCeiling ? '≥ 20' : (e.maxFrequencyHz / 1000).toFixed(1)} kHz`
    : '—';
}

// Cap the evolution chart to the most recent points for readability. The full
// list below is never truncated.
const CHART_MAX_POINTS = 12;

const FILTERS: {
  key:   HistoryFilter;
  label: string;
  icon:  React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { key: 'all',  label: 'Tous les tests',  icon: 'apps-outline' },
  { key: 'ptt',  label: 'Seuil auditif',   icon: 'ear' },
  { key: 'hfrt', label: 'Haute fréquence', icon: 'pulse' },
];

// ── Screen ──────────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const router = useRouter();
  const { loading, entries, refresh } = useTestHistory();
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const activeFilter = FILTERS.find(f => f.key === filter) ?? FILTERS[0];

  const filtered = useMemo(
    () => (filter === 'all' ? entries : entries.filter(e => e.testType === filter)),
    [entries, filter],
  );

  // Evolution points: chronological (oldest → newest), capped to the last N.
  // Only meaningful per test type (dB for PTT, kHz for HFRT) — the "Tous" view
  // has no common unit, so it shows a hint instead of a curve.
  const { points, unit, betterWhenHigher } = useMemo(() => {
    if (filter === 'all') {
      return { points: [] as EvolutionPoint[], unit: '', betterWhenHigher: true };
    }
    const chrono = [...filtered].reverse().slice(-CHART_MAX_POINTS);
    const unit = filter === 'ptt' ? 'dB' : 'kHz';
    const betterWhenHigher = filter !== 'ptt'; // lower dB = better hearing
    const points: EvolutionPoint[] = chrono.map(e => ({
      date:  e.createdAt,
      value: filter === 'ptt' ? toDisplayDb(e.ptaDb ?? 0) : (e.maxFrequencyHz ?? 0) / 1000,
    }));
    return { points, unit, betterWhenHigher };
  }, [filtered, filter]);

  const openDetail = (id: string) => router.push(`/test-detail/${id}` as any);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Historique des tests</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Filter */}
      <View style={styles.filterWrap}>
        <View style={styles.filterAnchor}>
          <Pressable
            onPress={() => setFilterMenuOpen(o => !o)}
            style={({ pressed }) => [
              styles.filterTrigger,
              filterMenuOpen && styles.filterTriggerOpen,
              pressed && styles.filterTriggerPressed,
            ]}
          >
            <View style={styles.filterTriggerLeft}>
              <Ionicons name={activeFilter.icon} size={16} color={Colors.primary} />
              <Text style={styles.filterTriggerText}>{activeFilter.label}</Text>
            </View>
            <Ionicons
              name={filterMenuOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={Colors.textSecondary}
            />
          </Pressable>

          {filterMenuOpen && (
            <View style={styles.filterMenu}>
              {FILTERS.map((f, i) => {
                const active = filter === f.key;
                return (
                  <Pressable
                    key={f.key}
                    onPress={() => { setFilter(f.key); setFilterMenuOpen(false); }}
                    style={({ pressed }) => [
                      styles.filterOption,
                      i > 0 && styles.filterOptionBorder,
                      active && styles.filterOptionActive,
                      pressed && styles.filterOptionPressed,
                    ]}
                  >
                    <View style={styles.filterOptionLeft}>
                      <Ionicons name={f.icon} size={16} color={active ? Colors.primary : Colors.textSecondary} />
                      <Text style={[styles.filterOptionText, active && styles.filterOptionTextActive]}>
                        {f.label}
                      </Text>
                    </View>
                    {active && <Ionicons name="checkmark" size={16} color={Colors.primary} />}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.primary} />
        }
      >
        {loading && entries.length === 0 && (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}

        {!loading && filtered.length === 0 && (
          <View style={styles.emptySection}>
            <View style={styles.emptyIconRing}>
              <Ionicons name="documents-outline" size={30} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Aucun test</Text>
            <Text style={styles.emptySub}>
              {filter === 'all'
                ? 'Vos tests apparaîtront ici une fois réalisés.'
                : "Aucun test de ce type pour l'instant."}
            </Text>
          </View>
        )}

        {/* Evolution chart */}
        {filtered.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Évolution</Text>
            {points.length >= 2 ? (
              <EvolutionChart
                points={points}
                unit={unit}
                betterWhenHigher={betterWhenHigher}
              />
            ) : (
              <View style={styles.chartHintCard}>
                <Ionicons name="information-circle-outline" size={16} color={Colors.textTertiary} />
                <Text style={styles.chartHintText}>
                  {filter === 'all'
                    ? 'Choisis « Seuil auditif » ou « Haute fréquence » pour afficher la courbe d’évolution (en dB ou en kHz).'
                    : 'Au moins deux tests sont nécessaires pour tracer une courbe d’évolution.'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* List */}
        {filtered.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Tous les tests</Text>
              <Text style={styles.sectionCount}>{filtered.length}</Text>
            </View>

            {filtered.map(item => {
              const isPTT = item.testType === 'ptt';
              return (
                <Pressable
                  key={item.id}
                  onPress={() => openDetail(item.id)}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                >
                  <View style={styles.rowIcon}>
                    <Ionicons
                      name={isPTT ? 'ear' : 'pulse'}
                      size={17}
                      color={Colors.primary}
                    />
                  </View>

                  <View style={styles.rowInfo}>
                    <Text style={styles.rowDate}>{formatDate(item.createdAt)}</Text>
                    <Text style={styles.rowSub}>{testLabel(item)}</Text>
                  </View>

                  <Text style={styles.rowValue}>{resultLabel(item)}</Text>

                  <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={13} color={Colors.textTertiary} />
          <Text style={styles.disclaimerText}>
            Dépistage indicatif sur appareil non calibré. Les valeurs servent au suivi personnel
            et ne remplacent pas un bilan audiologique.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

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

  filterWrap: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    paddingBottom: 10,
    zIndex: 20,
  },
  // Positioning context for the dropdown — it floats over the ScrollView
  // below instead of pushing it down.
  filterAnchor: {
    position: 'relative',
    marginHorizontal: 16,
    marginTop: 10,
  },
  filterTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  // Flattens the trigger's bottom corners while open so it visually merges
  // with the menu right below it, instead of reading as two separate boxes.
  filterTriggerOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderColor: Colors.primary,
  },
  filterTriggerPressed: { opacity: 0.85 },
  filterTriggerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterTriggerText: { fontSize: 14, fontWeight: '700', color: Colors.text },

  filterMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: Colors.primary,
    overflow: 'hidden',
    zIndex: 30,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 4, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  filterOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filterOptionActive: { backgroundColor: Colors.primaryLight },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  filterOptionBorder: { borderTopWidth: 0.5, borderTopColor: Colors.borderLight },
  filterOptionPressed: { backgroundColor: Colors.surfaceSecondary },
  filterOptionText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  filterOptionTextActive: { color: Colors.primary, fontWeight: '800' },

  centerBox: { paddingVertical: 60, alignItems: 'center' },

  section:      { marginHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, letterSpacing: -0.2, marginBottom: 10 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionCount: { fontSize: 13, color: Colors.textTertiary, fontWeight: '600' },

  chartHintCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 14,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chartHintText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowPressed: { opacity: 0.9, transform: [{ scale: 0.995 }] },
  rowIcon: {
    width: 42, height: 42,
    borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  rowInfo:  { flex: 1 },
  rowDate:  { fontSize: 14, fontWeight: '600', color: Colors.text },
  rowSub:   { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  rowValue: { fontSize: 15, fontWeight: '800', color: Colors.text, letterSpacing: -0.3 },
  rowBadge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  rowBadgeText: { fontSize: 9, fontWeight: '800' },

  emptySection: {
    marginHorizontal: 16,
    marginTop: 40,
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyIconRing: {
    width: 64, height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  emptySub:   { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 24, lineHeight: 20 },

  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 24,
    padding: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
  },
  disclaimerText: { flex: 1, fontSize: 11, color: Colors.textTertiary, lineHeight: 16 },
});
