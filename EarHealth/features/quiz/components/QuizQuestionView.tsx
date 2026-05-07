import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/colors';
import type { Question } from '../types/quiz.types';

interface QuizQuestionViewProps {
  question: Question;
  onAnswer: (index: number) => void;
}

export const QuizQuestionView: React.FC<QuizQuestionViewProps> = ({
  question,
  onAnswer,
}) => (
  <>
    <Card style={styles.questionCard}>
      <Text style={styles.questionTitle}>{question.question}</Text>
    </Card>

    <View style={styles.answersContainer}>
      {question.answers.map((answer, index) => (
        <TouchableOpacity
          key={index}
          style={styles.answerButton}
          onPress={() => onAnswer(index)}
          activeOpacity={0.7}
        >
          <Text style={styles.answerText}>{answer}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </>
);

const styles = StyleSheet.create({
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
});
