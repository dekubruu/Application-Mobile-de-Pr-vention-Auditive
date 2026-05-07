import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/colors';

interface QuizResultsViewProps {
  score: number;
  totalQuestions: number;
  onRetry: () => void;
  onBack: () => void;
}

function getResultCopy(score: number, total: number): { title: string; message: string } {
  const ratio = score / total;
  if (ratio === 1) return { title: 'Parfait !', message: 'Score parfait ! Vous êtes un expert de la santé auditive.' };
  if (ratio >= 0.8) return { title: 'Excellent !', message: 'Vous maîtrisez très bien le sujet de l\'audition.' };
  if (ratio >= 0.6) return { title: 'Bien !', message: 'Bonne connaissance ! Quelques points à revoir.' };
  return { title: 'À améliorer', message: 'Continuez à apprendre pour mieux protéger vos oreilles.' };
}

export const QuizResultsView: React.FC<QuizResultsViewProps> = ({
  score,
  totalQuestions,
  onRetry,
  onBack,
}) => {
  const { title, message } = getResultCopy(score, totalQuestions);
  const isGood = score / totalQuestions >= 0.6;

  return (
    <View style={styles.container}>
      <Card style={styles.scoreCard} elevated>
        <View style={[styles.scoreCircle, { borderColor: isGood ? Colors.success : Colors.warning }]}>
          <Text style={[styles.scoreNumber, { color: isGood ? Colors.success : Colors.warning }]}>
            {score}
          </Text>
          <Text style={[styles.scoreTotal, { color: isGood ? Colors.success : Colors.warning }]}>
            / {totalQuestions}
          </Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </Card>

      <View style={styles.actions}>
        <Button title="Rejouer" variant="primary" size="lg" onPress={onRetry} />
        <Button title="Retour au test" variant="secondary" size="lg" onPress={onBack} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
  },
  scoreCard: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  scoreCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },
  scoreNumber: {
    fontSize: 56,
    fontWeight: '700',
    letterSpacing: -1,
  },
  scoreTotal: {
    fontSize: 18,
    fontWeight: '600',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  actions: {
    gap: 10,
  },
});
