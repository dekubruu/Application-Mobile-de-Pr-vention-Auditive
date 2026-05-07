import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/colors';
import type { Question } from '../types/quiz.types';

interface QuizQuestionViewProps {
  question: Question;
  onAnswer: (index: number) => void;
}

const AnswerButton: React.FC<{ label: string; index: number; onPress: () => void }> = ({
  label,
  index,
  onPress,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const LETTERS = ['A', 'B', 'C', 'D'];

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() =>
          Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 2 }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 2 }).start()
        }
        style={({ pressed }) => [styles.answer, pressed && styles.answerPressed]}
      >
        <View style={styles.letterBadge}>
          <Text style={styles.letterText}>{LETTERS[index]}</Text>
        </View>
        <Text style={styles.answerText}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
};

export const QuizQuestionView: React.FC<QuizQuestionViewProps> = ({ question, onAnswer }) => (
  <>
    <Card style={styles.questionCard}>
      <Text style={styles.questionText}>{question.question}</Text>
    </Card>

    <View style={styles.answers}>
      {question.answers.map((answer, index) => (
        <AnswerButton key={index} label={answer} index={index} onPress={() => onAnswer(index)} />
      ))}
    </View>
  </>
);

const styles = StyleSheet.create({
  questionCard: {
    paddingVertical: 22,
    marginBottom: 16,
  },
  questionText: {
    fontSize: 18,
    lineHeight: 27,
    color: Colors.text,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  answers: {
    gap: 10,
  },
  answer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  answerPressed: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  letterBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  letterText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  answerText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
    flex: 1,
    lineHeight: 21,
  },
});
