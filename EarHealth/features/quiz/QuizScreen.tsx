import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { QuizProgressBar } from './components/QuizProgressBar';
import { QuizQuestionView } from './components/QuizQuestionView';
import { QuizResultsView } from './components/QuizResultsView';
import { useQuiz } from './hooks/useQuiz';

export default function QuizScreen() {
  const router = useRouter();
  const { currentQuestion, questionIndex, totalQuestions, score, gameEnded, handleAnswer, resetGame } = useQuiz();

  const header = (title: string) => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );

  if (gameEnded) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {header('Résultat')}
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      {header('Quiz Auditif')}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <QuizProgressBar current={questionIndex + 1} total={totalQuestions} />
        <QuizQuestionView question={currentQuestion} onAnswer={handleAnswer} />
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
    paddingBottom: 40,
  },
});
