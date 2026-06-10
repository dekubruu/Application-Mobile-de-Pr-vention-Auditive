import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import type { QuizStats } from '../types/quiz.types';
import { QuizDifficultyPicker, type DifficultyChoice } from './QuizDifficultyPicker';

interface QuizDashboardViewProps {
  stats:        QuizStats | null;
  loading:      boolean;
  error:        string | null;
  difficulty:   DifficultyChoice;
  onChangeDifficulty: (next: DifficultyChoice) => void;
  onStart:      () => void;
  onRefresh:    () => void;
}

function formatRelativeDate(iso: string | null): string {
  if (!iso) return 'Aucune session';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (diff === 0) return 'Aujourd’hui';
  if (diff === 1) return 'Hier';
  if (diff < 7)   return `Il y a ${diff} jours`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

export const QuizDashboardView: React.FC<QuizDashboardViewProps> = ({
  stats, loading, error, difficulty, onChangeDifficulty, onStart, onRefresh,
}) => {
  const empty = !loading && (!stats || stats.sessionsPlayed === 0);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero: total points */}
      <LinearGradient
        colors={['#0D8FA5', '#0B7285', '#064E5F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.decor1} />
        <View style={styles.decor2} />

        <Text style={styles.heroEyebrow}>POINTS CUMULÉS</Text>
        <View style={styles.heroValueRow}>
          {loading ? (
            <ActivityIndicator size="large" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.heroValue}>{stats?.totalPoints ?? 0}</Text>
              <Ionicons name="star" size={26} color="#FCD34D" style={{ marginLeft: 8 }} />
            </>
          )}
        </View>
        {!loading && stats && stats.lastSessionDate && (
          <Text style={styles.heroSub}>
            Dernière session : {formatRelativeDate(stats.lastSessionDate)}
          </Text>
        )}
        {empty && (
          <Text style={styles.heroSub}>Commencez votre premier quiz !</Text>
        )}
      </LinearGradient>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <StatCard
          icon="game-controller"
          value={loading ? '—' : String(stats?.sessionsPlayed ?? 0)}
          label="Sessions"
          color={Colors.primary}
        />
        <StatCard
          icon="help-circle"
          value={loading ? '—' : String(stats?.totalAnswered ?? 0)}
          label="Questions"
          color={Colors.primary}
        />
        <StatCard
          icon="checkmark-circle"
          value={loading ? '—' : String(stats?.totalCorrect ?? 0)}
          label="Bonnes rép."
          color={Colors.success}
        />
      </View>

      {/* Accuracy + best */}
      {!loading && stats && stats.sessionsPlayed > 0 && (
        <View style={styles.section}>
          <View style={styles.metricCard}>
            <View style={styles.metricLeft}>
              <Text style={styles.metricLabel}>Précision globale</Text>
              <Text style={styles.metricValue}>
                {stats.accuracyPct}<Text style={styles.metricUnit}>%</Text>
              </Text>
            </View>
            <View style={styles.metricBarTrack}>
              <View style={[
                styles.metricBarFill,
                { width: `${Math.min(100, stats.accuracyPct)}%`, backgroundColor: accuracyColor(stats.accuracyPct) },
              ]} />
            </View>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricLeft}>
              <Text style={styles.metricLabel}>Meilleure session</Text>
              <Text style={styles.metricValue}>
                {stats.bestSessionPct}<Text style={styles.metricUnit}>%</Text>
              </Text>
            </View>
            <View style={styles.metricBarTrack}>
              <View style={[
                styles.metricBarFill,
                { width: `${Math.min(100, stats.bestSessionPct)}%`, backgroundColor: Colors.warning },
              ]} />
            </View>
          </View>
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={onRefresh} hitSlop={8}>
            <Text style={styles.errorRetry}>Réessayer</Text>
          </Pressable>
        </View>
      )}

      {/* Empty state hint */}
      {empty && !error && (
        <View style={styles.emptyBox}>
          <Ionicons name="bulb-outline" size={16} color={Colors.primaryDark} />
          <Text style={styles.emptyText}>
            Chaque quiz contient 10 questions sur la santé auditive. Gagnez des points selon la difficulté.
          </Text>
        </View>
      )}

      {/* Difficulty picker */}
      <QuizDifficultyPicker value={difficulty} onChange={onChangeDifficulty} />

      {/* Start CTA */}
      <Pressable
        onPress={onStart}
        style={({ pressed }) => [styles.ctaWrapper, pressed && styles.ctaPressed]}
      >
        <LinearGradient
          colors={['#0D8FA5', '#0B7285', '#09616F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cta}
        >
          <View style={styles.ctaIconRing}>
            <Ionicons name="play" size={22} color={Colors.primary} />
          </View>
          <View style={styles.ctaText}>
            <Text style={styles.ctaTitle}>Lancer un quiz</Text>
            <Text style={styles.ctaSub}>10 questions · {difficultyLabel(difficulty)}</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.7)" />
        </LinearGradient>
      </Pressable>
    </ScrollView>
  );
};

// ── Stat card ──

const StatCard: React.FC<{
  icon:  React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  label: string;
  color: string;
}> = ({ icon, value, label, color }) => (
  <View style={styles.statCard}>
    <Ionicons name={icon} size={18} color={color} style={{ marginBottom: 6 }} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

function accuracyColor(pct: number): string {
  if (pct >= 80) return Colors.success;
  if (pct >= 60) return Colors.primary;
  if (pct >= 40) return Colors.warning;
  return Colors.error;
}

function difficultyLabel(d: DifficultyChoice): string {
  switch (d) {
    case 'easy':   return 'Facile';
    case 'medium': return 'Moyen';
    case 'hard':   return 'Difficile';
    case 'mixed':  return 'Mixte';
  }
}

// ── Styles ──

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // Hero
  hero: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    overflow: 'hidden',
  },
  decor1: {
    position: 'absolute', top: -40, right: -30,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decor2: {
    position: 'absolute', bottom: -50, left: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.2,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    minHeight: 64,
  },
  heroValue: {
    fontSize: 56,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -2,
    lineHeight: 60,
  },
  heroSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 6,
    fontWeight: '500',
  },

  // Stats grid (overlaps hero bottom)
  statsGrid: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: -22,
    gap: 10,
    zIndex: 2,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.09, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  // Metrics
  section: {
    marginHorizontal: 16,
    marginTop: 18,
    gap: 10,
  },
  metricCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricLeft: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  metricUnit: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  metricBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  metricBarFill: { height: '100%', borderRadius: 3 },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  errorText:  { flex: 1, fontSize: 12, color: Colors.error, fontWeight: '600' },
  errorRetry: { fontSize: 12, color: Colors.error, fontWeight: '800', textDecorationLine: 'underline' },

  // Empty
  emptyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 12,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
  },
  emptyText: {
    flex: 1,
    fontSize: 12,
    color: Colors.primaryDark,
    fontWeight: '500',
    lineHeight: 18,
  },

  // CTA
  ctaWrapper: {
    marginHorizontal: 16,
    marginTop: 22,
    borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14 },
      android: { elevation: 6 },
    }),
  },
  ctaPressed: { opacity: 0.9 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 14,
  },
  ctaIconRing: {
    width: 46, height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { flex: 1 },
  ctaTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.2 },
  ctaSub:   { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 3, fontWeight: '500' },
});
