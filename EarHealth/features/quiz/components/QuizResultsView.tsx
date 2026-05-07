import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Colors } from '@/constants/colors';

interface QuizResultsViewProps {
  score: number;
  totalQuestions: number;
  onRetry: () => void;
  onBack: () => void;
}

export const QuizResultsView: React.FC<QuizResultsViewProps> = ({
  score,
  totalQuestions,
  onRetry,
  onBack,
}) => (
  <View style={styles.container}>
    <View style={styles.scoreCircle}>
      <Text style={styles.scoreNumber}>{score}</Text>
      <Text style={styles.scoreTotal}>/ {totalQuestions}</Text>
    </View>

    <Text style={styles.resultTitle}>Excellent!</Text>
    <Text style={styles.resultMessage}>
      Vous maîtrisez bien le sujet de l'audition.
    </Text>

    <View style={styles.actions}>
      <Button title="Rejouer" variant="primary" size="lg" onPress={onRetry} />
      <Button
        title="Retour Accueil"
        variant="secondary"
        size="lg"
        onPress={onBack}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  scoreCircle: {
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
  actions: {
    width: '100%',
    gap: 12,
  },
});
