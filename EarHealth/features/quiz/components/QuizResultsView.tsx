import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/colors';
import type { QuizResult } from '../types/quiz.types';

interface QuizResultsViewProps {
  result:  QuizResult;
  onRetry: () => void;
  onBack:  () => void;
}

function getResultCopy(ratio: number): { title: string; message: string } {
  if (ratio === 1)    return { title: 'Parfait !',  message: 'Score parfait ! Vous êtes un expert de la santé auditive.' };
  if (ratio >= 0.8)   return { title: 'Excellent !', message: 'Vous maîtrisez très bien le sujet de l’audition.' };
  if (ratio >= 0.6)   return { title: 'Bien !',     message: 'Bonne connaissance ! Quelques points à revoir.' };
  return { title: 'À améliorer', message: 'Continuez à apprendre pour mieux protéger vos oreilles.' };
}

export const QuizResultsView: React.FC<QuizResultsViewProps> = ({
  result, onRetry, onBack,
}) => {
  const { correctCount, incorrectCount, totalQuestions, pointsTotal, pointsMax } = result;
  const ratio   = totalQuestions > 0 ? correctCount / totalQuestions : 0;
  const isGood  = ratio >= 0.6;
  const { title, message } = getResultCopy(ratio);
  const accent  = isGood ? Colors.success : Colors.warning;

  return (
    <View style={styles.container}>
      <Card style={styles.scoreCard} elevated>
        <View style={[styles.scoreCircle, { borderColor: accent }]}>
          <Text style={[styles.scoreNumber, { color: accent }]}>{correctCount}</Text>
          <Text style={[styles.scoreTotal, { color: accent }]}>/ {totalQuestions}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </Card>

      {/* Stat grid */}
      <View style={styles.statsRow}>
        <StatCard
          icon="checkmark-circle"
          value={String(correctCount)}
          label="Bonnes réponses"
          color={Colors.success}
        />
        <StatCard
          icon="close-circle"
          value={String(incorrectCount)}
          label="Mauvaises"
          color={Colors.error}
        />
        <StatCard
          icon="star"
          value={String(pointsTotal)}
          label={`/ ${pointsMax} pts`}
          color={Colors.warning}
        />
      </View>

      <View style={styles.actions}>
        <Button title="Rejouer (nouvelles questions)" variant="primary" size="lg" onPress={onRetry} />
        <Button title="Retour au test" variant="secondary" size="lg" onPress={onBack} />
      </View>
    </View>
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
    <Ionicons name={icon} size={18} color={color} style={{ marginBottom: 4 }} />
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { paddingTop: 8 },

  scoreCard: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  scoreCircle: {
    width: 152,
    height: 152,
    borderRadius: 76,
    borderWidth: 3,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },
  scoreNumber: { fontSize: 54, fontWeight: '800', letterSpacing: -1, lineHeight: 58 },
  scoreTotal:  { fontSize: 18, fontWeight: '700', marginTop: 2 },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
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

  actions: { gap: 10 },
});
