import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { useThemeColors } from '@/features/theme/ThemeContext';

const OPTIONS = [
  { label: 'Homme', value: 'male' },
  { label: 'Femme', value: 'female' },
] as const;

interface GenderSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
}

export const GenderSelector: React.FC<GenderSelectorProps> = ({
  value,
  onChange,
  label = 'Genre',
  error,
}) => {
  const { colors: tierColors } = useThemeColors();
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.genderRow}>
        {OPTIONS.map(opt => {
          const active = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={[
                styles.genderBtn,
                active && { borderColor: tierColors.primary, backgroundColor: tierColors.primaryLight },
              ]}
              onPress={() => onChange(opt.value)}
            >
              <Text style={[styles.genderLabel, active && { color: tierColors.primary }]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.errorInline}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  fieldBlock: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 7, letterSpacing: 0.1 },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', backgroundColor: Colors.surface,
  },
  genderLabel: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  errorInline: { fontSize: 12, color: Colors.error, marginTop: 6, fontWeight: '500' },
});
