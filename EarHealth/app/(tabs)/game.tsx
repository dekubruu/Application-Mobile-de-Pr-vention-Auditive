// app/game.tsx
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Colors } from '../../constants/colors';

interface Question {
  question: string;
  answers: string[];
  correct: number;
}

const questions: Question[] = [
  {
    question: 'Quelle est la fréquence normale de la parole humaine?',
    answers: ['100-300 Hz', '250-2000 Hz', '5000-8000 Hz', '10000+ Hz'],
    correct: 1,
  },
  {
    question: 'À quel niveau de bruit commence-t-on à risquer une perte auditive?',
    answers: ['50 dB', '75 dB', '85 dB', '120 dB'],
    correct: 2,
  },
  {
    question: 'Combien de temps par jour peut-on écouter à 85 dB sans risque?',
    answers: ['8 heures', '4 heures', '2 heures', '30 minutes'],
    correct: 0,
  },
  {
    question: "L'audition peut-elle se régénérer naturellement?",
    answers: ['Oui, en 1 mois', 'Oui, en 1 an', 'Non, jamais', 'Partiellement'],
    correct: 2,
  },
  {
    question: 'Quel est le meilleur conseil pour protéger ses oreilles?',
    answers: [
      'Augmenter le volume',
      'Faire des pauses',
      'Porter des bouchons',
      'Tous les conseils ci-dessus sauf le 1',
    ],
    correct: 3,
  },
];

export default function GameScreen() {
  const router = useRouter();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);

  const currentQuestion = questions[questionIndex];

  const handleAnswer = (answerIndex: number) => {
    if (answerIndex === currentQuestion.correct) {
      setScore(score + 1);
    }

    if (questionIndex < questions.length - 1) {
      setQuestionIndex(questionIndex + 1);
    } else {
      setGameEnded(true);
    }
  };

  const resetGame = () => {
    setQuestionIndex(0);
    setScore(0);
    setGameEnded(false);
  };

  if (gameEnded) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Résultat</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.resultContainer}>
            <View style={styles.scoreCircleLarge}>
              <Text style={styles.scoreNumber}>{score}</Text>
              <Text style={styles.scoreTotal}>/ {questions.length}</Text>
            </View>

            <Text style={styles.resultTitle}>Excellent!</Text>
            <Text style={styles.resultMessage}>
              Vous maîtrisez bien le sujet de l'audition.
            </Text>

            <View style={styles.resultActions}>
              <Button
                title="Rejouer"
                variant="primary"
                size="lg"
                onPress={resetGame}
              />
              <Button
                title="Retour Accueil"
                variant="secondary"
                size="lg"
                onPress={() => router.push('/test')}
              />
            </View>
          </View>
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
        {/* Progress */}
        <Card>
          <View style={styles.gameProgress}>
            <Text style={styles.progressText}>
              Question {questionIndex + 1} / {questions.length}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(((questionIndex + 1) / questions.length) * 100)}%`,
                  },
                ]}
              />
            </View>
          </View>
        </Card>

        {/* Question */}
        <Card style={styles.questionCard}>
          <Text style={styles.questionTitle}>{currentQuestion.question}</Text>
        </Card>

        {/* Answers */}
        <View style={styles.answersContainer}>
          {currentQuestion.answers.map((answer, index) => (
            <TouchableOpacity
              key={index}
              style={styles.answerButton}
              onPress={() => handleAnswer(index)}
              activeOpacity={0.7}
            >
              <Text style={styles.answerText}>{answer}</Text>
            </TouchableOpacity>
          ))}
        </View>

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
  backButton: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
  },
  scrollView: {
    padding: 16,
  },
  gameProgress: {
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: Colors.text,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  questionCard: {
    paddingVertical: 20,
  },
  questionTitle: {
    fontSize: 18,
    lineHeight: 26,
    color: Colors.text,
    fontWeight: '500',
  },
  answersContainer: {
    gap: 12,
    marginBottom: 16,
  },
  answerButton: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  answerText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'left',
  },
  resultContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  scoreCircleLarge: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  scoreNumber: {
    fontSize: 56,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scoreTotal: {
    fontSize: 18,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    color: Colors.text,
  },
  resultMessage: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  resultActions: {
    width: '100%',
    gap: 12,
  },
});
