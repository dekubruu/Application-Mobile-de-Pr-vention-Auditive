import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';

interface QuizErrorViewProps {
  message: string;
  onRetry: () => void;
  onBack:  () => void;
}

export const QuizErrorView: React.FC<QuizErrorViewProps> = ({
  message, onRetry, onBack,
}) => (
  <View style={styles.container}>
    <View style={styles.iconRing}>
      <Ionicons name="alert-circle-outline" size={42} color={Colors.warning} />
    </View>
    <Text style={styles.title}>Impossible de charger le quiz</Text>
    <Text style={styles.sub}>{message}</Text>

    <View style={styles.actions}>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
      >
        <Ionicons name="refresh" size={18} color="#FFFFFF" />
        <Text style={styles.btnPrimaryText}>Réessayer</Text>
      </Pressable>
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed]}
      >
        <Text style={styles.btnSecondaryText}>Retour</Text>
      </Pressable>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 14,
  },
  iconRing: {
    width: 92, height: 92,
    borderRadius: 46,
    backgroundColor: Colors.warningLight,
    borderWidth: 2,
    borderColor: Colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: -0.4,
    marginTop: 6,
  },
  sub: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  actions: {
    width: '100%',
    gap: 10,
    marginTop: 12,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    ...Platform.select({
      ios:     { shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10 },
      android: { elevation: 4 },
    }),
  },
  btnPrimaryText:  { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  btnSecondary: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  btnSecondaryText: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },

  pressed: { opacity: 0.88 },
});
