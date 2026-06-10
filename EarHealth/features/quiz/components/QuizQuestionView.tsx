import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/colors';
import type { Question, QuizCategory, QuizDifficulty } from '../types/quiz.types';

interface QuizQuestionViewProps {
  question:        Question;
  selectedAnswer:  number | null;     // null until user picks
  showExplanation: boolean;           // true once answered
  onAnswer:        (index: number) => void;
  onNext:          () => void;
  isLastQuestion:  boolean;
}

const LETTERS = ['A', 'B', 'C', 'D'];

const CATEGORY_LABELS: Record<QuizCategory, string> = {
  anatomy:    'Anatomie',
  general:    'Général',
  prevention: 'Prévention',
  protection: 'Protection',
  noise:      'Bruit',
};

const DIFFICULTY_LABELS: Record<QuizDifficulty, string> = {
  easy:   'Facile',
  medium: 'Moyen',
  hard:   'Difficile',
};

const DIFFICULTY_COLOR: Record<QuizDifficulty, string> = {
  easy:   Colors.success,
  medium: Colors.primary,
  hard:   Colors.error,
};

// ── Answer button with feedback state ────────────────────────────────────────

interface AnswerButtonProps {
  label:    string;
  index:    number;
  selected: number | null;
  correct:  number;
  revealed: boolean;
  onPress:  () => void;
}

const AnswerButton: React.FC<AnswerButtonProps> = ({
  label, index, selected, correct, revealed, onPress,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const isSelected = selected === index;
  const isCorrect  = revealed && index === correct;
  const isWrong    = revealed && isSelected && index !== correct;
  const disabled   = revealed;

  const variantStyle =
    isCorrect ? styles.answerCorrect :
    isWrong   ? styles.answerWrong :
    revealed  ? styles.answerMuted :
    isSelected ? styles.answerSelected : null;

  const letterStyle =
    isCorrect ? styles.letterCorrect :
    isWrong   ? styles.letterWrong :
    null;

  const textStyle =
    isCorrect ? styles.answerTextCorrect :
    isWrong   ? styles.answerTextWrong :
    revealed  ? styles.answerTextMuted :
    null;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        onPressIn={() =>
          !disabled &&
          Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 2 }).start()
        }
        onPressOut={() =>
          !disabled &&
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 2 }).start()
        }
        style={({ pressed }) => [
          styles.answer,
          variantStyle,
          pressed && !disabled && styles.answerPressed,
        ]}
      >
        <View style={[styles.letterBadge, letterStyle]}>
          {isCorrect ? (
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          ) : isWrong ? (
            <Ionicons name="close" size={16} color="#FFFFFF" />
          ) : (
            <Text style={styles.letterText}>{LETTERS[index]}</Text>
          )}
        </View>
        <Text style={[styles.answerText, textStyle]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
};

// ── Main view ────────────────────────────────────────────────────────────────

export const QuizQuestionView: React.FC<QuizQuestionViewProps> = ({
  question,
  selectedAnswer,
  showExplanation,
  onAnswer,
  onNext,
  isLastQuestion,
}) => {
  const isCorrect = selectedAnswer === question.correct;
  const diffColor = DIFFICULTY_COLOR[question.difficulty];

  return (
    <>
      {/* Meta badges */}
      <View style={styles.metaRow}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{CATEGORY_LABELS[question.category]}</Text>
        </View>
        <View style={[styles.diffBadge, { backgroundColor: diffColor + '22' }]}>
          <View style={[styles.diffDot, { backgroundColor: diffColor }]} />
          <Text style={[styles.diffText, { color: diffColor }]}>
            {DIFFICULTY_LABELS[question.difficulty]}
          </Text>
        </View>
        <View style={styles.pointsBadge}>
          <Ionicons name="star" size={11} color={Colors.warning} />
          <Text style={styles.pointsText}>{question.points} pts</Text>
        </View>
      </View>

      <Card style={styles.questionCard}>
        <Text style={styles.questionText}>{question.question}</Text>
      </Card>

      <View style={styles.answers}>
        {question.answers.map((answer, index) => (
          <AnswerButton
            key={index}
            label={answer}
            index={index}
            selected={selectedAnswer}
            correct={question.correct}
            revealed={showExplanation}
            onPress={() => onAnswer(index)}
          />
        ))}
      </View>

      {/* Feedback + explanation */}
      {showExplanation && (
        <View style={[
          styles.feedbackCard,
          isCorrect ? styles.feedbackCorrect : styles.feedbackWrong,
        ]}>
          <View style={styles.feedbackHeader}>
            <Ionicons
              name={isCorrect ? 'checkmark-circle' : 'close-circle'}
              size={22}
              color={isCorrect ? Colors.success : Colors.error}
            />
            <Text style={[
              styles.feedbackTitle,
              { color: isCorrect ? Colors.success : Colors.error },
            ]}>
              {isCorrect
                ? `Bonne réponse ! +${question.points} pts`
                : 'Mauvaise réponse'}
            </Text>
          </View>

          {question.explanation && (
            <Text style={styles.explanationText}>{question.explanation}</Text>
          )}
        </View>
      )}

      {/* Next button */}
      {showExplanation && (
        <Pressable
          onPress={onNext}
          style={({ pressed }) => [styles.nextBtn, pressed && styles.nextBtnPressed]}
        >
          <Text style={styles.nextBtnText}>
            {isLastQuestion ? 'Voir les résultats' : 'Question suivante'}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </Pressable>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  // Meta row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  diffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  diffDot:  { width: 6, height: 6, borderRadius: 3 },
  diffText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.warningLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pointsText: { fontSize: 10, fontWeight: '800', color: Colors.warning, letterSpacing: 0.4 },

  // Question
  questionCard: { paddingVertical: 22, marginBottom: 16 },
  questionText: {
    fontSize: 18,
    lineHeight: 27,
    color: Colors.text,
    fontWeight: '500',
    letterSpacing: -0.1,
  },

  // Answers
  answers: { gap: 10 },
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
  answerSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  answerCorrect: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.success,
  },
  answerWrong: {
    backgroundColor: Colors.errorLight,
    borderColor: Colors.error,
  },
  answerMuted: {
    opacity: 0.6,
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
  letterCorrect: { backgroundColor: Colors.success },
  letterWrong:   { backgroundColor: Colors.error },
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
  answerTextCorrect: { color: Colors.success, fontWeight: '700' },
  answerTextWrong:   { color: Colors.error,   fontWeight: '700' },
  answerTextMuted:   { color: Colors.textTertiary },

  // Feedback + explanation
  feedbackCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  feedbackCorrect: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.success,
  },
  feedbackWrong: {
    backgroundColor: Colors.errorLight,
    borderColor: Colors.error,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  explanationText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 19,
    fontWeight: '500',
  },

  // Next button
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    marginTop: 16,
    ...Platform.select({
      ios:     { shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10 },
      android: { elevation: 4 },
    }),
  },
  nextBtnPressed: { opacity: 0.88 },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});
