import { useRouter } from 'expo-router';
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { QuizProgressBar } from './components/QuizProgressBar';
import { QuizQuestionView } from './components/QuizQuestionView';
import { QuizResultsView } from './components/QuizResultsView';
import { useQuiz } from './hooks/useQuiz';

export default function QuizScreen() {
  const router = useRouter();
  const {
    currentQuestion,
    questionIndex,
    totalQuestions,
    score,
    gameEnded,
    handleAnswer,
    resetGame,
  } = useQuiz();

  if (gameEnded) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Résultat</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <QuizResultsView
            score={score}
            totalQuestions={totalQuestions}
            onRetry={resetGame}
            onBack={() => router.push('/test')}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quiz Auditif</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <QuizProgressBar current={questionIndex + 1} total={totalQuestions} />
        <QuizQuestionView question={currentQuestion} onAnswer={handleAnswer} />
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
  scrollView: {
    padding: 16,
  },
});
