import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { useThemeColors } from '@/features/theme/ThemeContext';
import type { QuizSessionRow, QuizStats } from '../types/quiz.types';
import { QuizDifficultyPicker, type DifficultyChoice } from './QuizDifficultyPicker';

interface QuizDashboardViewProps {
  stats:        QuizStats | null;
  loading:      boolean;
  error:        string | null;
  difficulty:   DifficultyChoice;
  onChangeDifficulty: (next: DifficultyChoice) => void;
  onStart:      () => void;
  onRefresh:    () => void;
  history:        QuizSessionRow[];
  historyLoading: boolean;
}

function accuracyColor(pct: number, primary: string): string {
  if (pct >= 80) return Colors.success;
  if (pct >= 60) return primary;
  if (pct >= 40) return Colors.warning;
  return Colors.error;
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
  history, historyLoading,
}) => {
  const { colors: tierColors } = useThemeColors();
  const empty = !loading && (!stats || stats.sessionsPlayed === 0);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero: total points */}
      <LinearGradient
        colors={tierColors.gradient}
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
          color={tierColors.primary}
        />
        <StatCard
          icon="checkmark-circle"
          value={loading ? '—' : `${stats?.correctDistinct ?? 0}/${stats?.totalQuestionsInApp ?? 0}`}
          label="Bonnes rép."
          color={Colors.success}
        />
        <StatCard
          icon="trophy"
          value={loading ? '—' : String(stats?.bestSessionPoints ?? 0)}
          label="Meilleur score"
          color={Colors.warning}
        />
      </View>

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
        <View style={[styles.emptyBox, { backgroundColor: tierColors.primaryLight }]}>
          <Ionicons name="bulb-outline" size={16} color={tierColors.primaryDark} />
          <Text style={[styles.emptyText, { color: tierColors.primaryDark }]}>
            Chaque quiz contient 10 questions sur la santé auditive. Gagnez des points selon la difficulté.
          </Text>
        </View>
      )}

      {/* Difficulty picker */}
      <QuizDifficultyPicker value={difficulty} onChange={onChangeDifficulty} />

      {/* Start CTA */}
      <Pressable
        onPress={onStart}
        style={({ pressed }) => [
          styles.ctaWrapper,
          { shadowColor: tierColors.primaryDark },
          pressed && styles.ctaPressed,
        ]}
      >
        <LinearGradient
          colors={tierColors.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cta}
        >
          <View style={styles.ctaIconRing}>
            <Ionicons name="play" size={22} color={tierColors.primary} />
          </View>
          <View style={styles.ctaText}>
            <Text style={styles.ctaTitle}>Lancer un quiz</Text>
            <Text style={styles.ctaSub}>10 questions · {difficultyLabel(difficulty)}</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.7)" />
        </LinearGradient>
      </Pressable>

      {/* Derniers quiz */}
      {!empty && (
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Derniers quiz</Text>
          {historyLoading && history.length === 0 ? (
            <ActivityIndicator color={tierColors.primary} style={styles.historyLoading} />
          ) : (
            history.map(item => {
              const pct = item.total_questions > 0
                ? Math.round((item.correct_count / item.total_questions) * 100)
                : 0;
              const color = accuracyColor(pct, tierColors.primary);
              return (
                <View key={item.id} style={styles.historyRow}>
                  <View style={[styles.historyIcon, { backgroundColor: color + '18' }]}>
                    <Ionicons name="game-controller" size={16} color={color} />
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyDate}>{formatRelativeDate(item.created_at)}</Text>
                    <Text style={styles.historySub}>
                      {item.correct_count}/{item.total_questions} bonnes réponses
                      {item.difficulty ? ` · ${difficultyLabel(item.difficulty)}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.historyPoints}>+{item.points_earned} pts</Text>
                </View>
              );
            })
          )}
        </View>
      )}
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

  // Derniers quiz
  historySection: {
    marginHorizontal: 16,
    marginTop: 18,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.2,
    marginBottom: 10,
  },
  historyLoading: { marginTop: 8 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  historyIcon: {
    width: 36, height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyInfo: { flex: 1 },
  historyDate: { fontSize: 13, fontWeight: '700', color: Colors.text },
  historySub:  { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  historyPoints: { fontSize: 13, fontWeight: '800', color: Colors.warning },

  // Empty
  emptyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
  },
  emptyText: {
    flex: 1,
    fontSize: 12,
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
      ios:     { shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14 },
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
