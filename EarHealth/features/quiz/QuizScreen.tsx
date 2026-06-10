import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { QuizDashboardView } from './components/QuizDashboardView';
import type { DifficultyChoice } from './components/QuizDifficultyPicker';
import { QuizErrorView } from './components/QuizErrorView';
import { QuizLoadingView } from './components/QuizLoadingView';
import { QuizProgressBar } from './components/QuizProgressBar';
import { QuizQuestionView } from './components/QuizQuestionView';
import { QuizResultsView } from './components/QuizResultsView';
import { useQuiz } from './hooks/useQuiz';
import { useQuizStats } from './hooks/useQuizStats';
import type { QuizDifficulty } from './types/quiz.types';

export default function QuizScreen() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  // ── Dashboard selection (persisted only in memory while on screen) ──
  const [difficulty, setDifficulty] = useState<DifficultyChoice>('mixed');

  // Memoized to keep the array reference stable across renders. Without this,
  // useQuiz's `start` useCallback would be re-created every render — harmless
  // today (autoLoad=false) but would cause an infinite render loop if autoLoad
  // were ever turned on with a non-mixed selection.
  const difficulties = useMemo<QuizDifficulty[] | undefined>(
    () => (difficulty === 'mixed' ? undefined : [difficulty as QuizDifficulty]),
    [difficulty],
  );

  // Dashboard stats
  const { stats, status: statsStatus, error: statsError, refresh: refreshStats } =
    useQuizStats(userId);

  // Quiz session — difficulty filter is applied at fetch time inside useQuiz.start()
  const quiz = useQuiz({
    count:        10,
    difficulties,
    userId,
    onSaved:      refreshStats,
  });

  const goToDashboard = () => quiz.reset();

  // ── Helpers ──
  const headerSimple = (title: string) => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );

  const headerWithBack = (title: string, onBack: () => void) => (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.backBtn} hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color={Colors.text} />
      </Pressable>
      <Text style={styles.headerTitleCentered}>{title}</Text>
      <View style={styles.backBtn} />
    </View>
  );

  // ── Phase 1: dashboard (idle) ──
  if (quiz.status === 'idle') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {headerSimple('Quiz Auditif')}
        <QuizDashboardView
          stats={stats}
          loading={statsStatus === 'loading'}
          error={statsError}
          difficulty={difficulty}
          onChangeDifficulty={setDifficulty}
          onStart={quiz.start}
          onRefresh={refreshStats}
        />
      </SafeAreaView>
    );
  }

  // ── Phase 2: loading questions ──
  if (quiz.status === 'loading') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {headerWithBack('Quiz Auditif', goToDashboard)}
        <QuizLoadingView />
      </SafeAreaView>
    );
  }

  // ── Phase 3: error fetching ──
  if (quiz.status === 'error') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {headerWithBack('Quiz Auditif', goToDashboard)}
        <QuizErrorView
          message={quiz.error ?? 'Une erreur inconnue est survenue.'}
          onRetry={quiz.retry}
          onBack={goToDashboard}
        />
      </SafeAreaView>
    );
  }

  // ── Phase 4: results ──
  if (quiz.gameEnded) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {headerWithBack('Résultat', goToDashboard)}
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {quiz.saveStatus === 'saving' && (
            <View style={styles.saveBanner}>
              <Text style={styles.saveBannerText}>Enregistrement…</Text>
            </View>
          )}
          {quiz.saveStatus === 'queued' && (
            <View style={styles.saveBannerQueued}>
              <Ionicons name="cloud-offline-outline" size={14} color={Colors.primaryDark} />
              <Text style={styles.saveBannerQueuedText}>
                Enregistré localement. Sera synchronisé à la reconnexion.
              </Text>
            </View>
          )}
          {quiz.saveStatus === 'error' && (
            <View style={styles.saveBannerError}>
              <Ionicons name="warning-outline" size={14} color={Colors.warning} />
              <Text style={styles.saveBannerErrorText}>
                Échec de l’enregistrement. La progression locale est conservée.
              </Text>
            </View>
          )}
          <QuizResultsView
            result={quiz.result}
            onRetry={quiz.restart}
            onBack={goToDashboard}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Phase 5: question (ready) ──
  if (!quiz.currentQuestion) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {headerWithBack('Quiz Auditif', goToDashboard)}
        <QuizErrorView
          message="Aucune question à afficher."
          onRetry={quiz.retry}
          onBack={goToDashboard}
        />
      </SafeAreaView>
    );
  }

  const isLast = quiz.questionIndex === quiz.totalQuestions - 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {headerWithBack('Quiz Auditif', goToDashboard)}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <QuizProgressBar current={quiz.questionIndex + 1} total={quiz.totalQuestions} />
        <QuizQuestionView
          question={quiz.currentQuestion}
          selectedAnswer={quiz.selectedAnswer}
          showExplanation={quiz.showExplanation}
          onAnswer={quiz.selectAnswer}
          onNext={quiz.goNext}
          isLastQuestion={isLast}
        />
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
  headerTitleCentered: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  backBtn: {
    width: 38, height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSecondary,
  },
  content: { padding: 16, paddingBottom: 40 },

  saveBanner: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  saveBannerText: { fontSize: 12, color: Colors.primaryDark, fontWeight: '700' },

  saveBannerError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.warningLight,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  saveBannerErrorText: { flex: 1, fontSize: 12, color: Colors.warning, fontWeight: '600' },

  saveBannerQueued: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  saveBannerQueuedText: { flex: 1, fontSize: 12, color: Colors.primaryDark, fontWeight: '600' },
});
