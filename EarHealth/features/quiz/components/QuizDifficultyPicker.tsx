import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { useThemeColors } from '@/features/theme/ThemeContext';
import type { QuizDifficulty } from '../types/quiz.types';

export type DifficultyChoice = QuizDifficulty | 'mixed';

interface QuizDifficultyPickerProps {
  value:    DifficultyChoice;
  onChange: (next: DifficultyChoice) => void;
}

interface Option {
  id:     DifficultyChoice;
  label:  string;
  hint:   string;     // points hint shown below
  color:  string;
}

function getOptions(primary: string): Option[] {
  return [
    { id: 'mixed',  label: 'Mixte',    hint: 'Toutes',  color: Colors.textSecondary },
    { id: 'easy',   label: 'Facile',   hint: '10 pts',  color: Colors.success },
    { id: 'medium', label: 'Moyen',    hint: '20 pts',  color: primary },
    { id: 'hard',   label: 'Difficile', hint: '30 pts', color: Colors.error },
  ];
}

export const QuizDifficultyPicker: React.FC<QuizDifficultyPickerProps> = ({
  value, onChange,
}) => {
  const { colors: tierColors } = useThemeColors();
  const OPTIONS = getOptions(tierColors.primary);
  return (
  <View style={styles.container}>
    <Text style={styles.title}>Difficulté</Text>
    <View style={styles.row}>
      {OPTIONS.map(opt => {
        const selected = value === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange(opt.id)}
            style={({ pressed }) => [
              styles.chip,
              selected && styles.chipSelected,
              selected && { borderColor: opt.color },
              pressed && styles.chipPressed,
            ]}
          >
            <View style={[styles.dot, { backgroundColor: opt.color }]} />
            <View style={styles.chipText}>
              <Text style={[
                styles.chipLabel,
                selected && { color: opt.color },
              ]}>
                {opt.label}
              </Text>
              <Text style={styles.chipHint}>{opt.hint}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 18,
  },
  title: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 2,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipSelected: {
    borderWidth: 2,
    backgroundColor: Colors.surface,
  },
  chipPressed: { opacity: 0.85 },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  chipText: { flex: 1, gap: 1 },
  chipLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  chipHint: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
