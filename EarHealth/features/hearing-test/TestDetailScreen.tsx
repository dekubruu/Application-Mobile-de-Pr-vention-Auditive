import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { HFRTResultView } from './components/HFRTResultView';
import { PTTResultView } from './components/PTTResultView';
import {
  getHearingTestById,
  type StoredHearingTestRow,
} from './services/HearingResultService';
import type { HFRTPayload, PTTPayload } from './services/hearing.storage';
import type { HFRTResult } from './types/hfrt.types';
import type { PTTEarResult } from './types/ptt.types';

// ── Payload → view-model adapters ─────────────────────────────────────────────
// The stored PTT payload keeps only {freq, db} per point (no per-frequency
// reliability / reversals). We reconstruct the shape PTTResultView needs and
// mark points reliable (the "~" unreliable flag is unavailable for history).
function toPTTEarResults(payload: PTTPayload): PTTEarResult[] {
  return payload.ears.map(e => ({
    ear:    e.ear,
    avgDb:  e.avgDb,
    thresholds: e.thresholds.map(t => ({
      frequency:     t.freq,
      thresholdDb:   t.db,
      reversals:     0,
      presentations: 0,
      reliable:      true,
    })),
  }));
}

function toHFRTResult(payload: HFRTPayload): HFRTResult {
  return {
    maxAudibleFrequency: payload.maxFrequencyHz,
    reliable:            payload.reliable   ?? false,
    durationMs:          payload.durationMs ?? 0,
    hitCeiling:          payload.hitCeiling ?? false,
    noResponse:          payload.noResponse ?? false,
    reversals:           payload.reversals  ?? 0,
  };
}

function fullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ── Screen ──────────────────────────────────────────────────────────────────

export default function TestDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile } = useAuth();
  const userId = session?.user.id ?? null;
  const dateOfBirth = profile?.date_of_birth ?? null;

  const [loading, setLoading] = useState(true);
  const [row, setRow]         = useState<StoredHearingTestRow | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!userId || !id) { setLoading(false); return; }
      setLoading(true);
      const r = await getHearingTestById(userId, id);
      if (alive) { setRow(r); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [userId, id]);

  const isPTT = row?.test_type === 'ptt';
  const title = isPTT ? 'Pure Tone Threshold' : 'Test haute fréquence';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{row ? title : 'Détail du test'}</Text>
        <View style={styles.backBtn} />
      </View>

      {loading && (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      {!loading && !row && (
        <View style={styles.centerBox}>
          <View style={styles.emptyIconRing}>
            <Ionicons name="alert-circle-outline" size={30} color={Colors.warning} />
          </View>
          <Text style={styles.emptyTitle}>Test introuvable</Text>
          <Text style={styles.emptySub}>
            Ce test n’a pas pu être chargé. Il a peut-être été supprimé, ou la
            connexion est indisponible.
          </Text>
        </View>
      )}

      {!loading && row && (
        <>
          <View style={styles.dateBar}>
            <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.dateText}>{fullDate(row.created_at)}</Text>
          </View>

          {isPTT ? (
            <PTTResultView earResults={toPTTEarResults(row.payload as PTTPayload)} />
          ) : (
            <HFRTResultView
              result={toHFRTResult(row.payload as HFRTPayload)}
              dateOfBirth={dateOfBirth}
              ageAtTest={(row.payload as HFRTPayload).ageAtTest ?? null}
            />
          )}
        </>
      )}
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
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 16, fontWeight: '700',
    color: Colors.text, letterSpacing: -0.2,
  },

  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.surfaceSecondary,
  },
  dateText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600', textTransform: 'capitalize' },

  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIconRing: {
    width: 64, height: 64,
    borderRadius: 32,
    backgroundColor: Colors.warningLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  emptySub:   { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
