import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';

interface HeadphoneGateViewProps {
  onNext:   () => void;
  onCancel: () => void;
}

export const HeadphoneGateView: React.FC<HeadphoneGateViewProps> = ({
  onNext,
  onCancel,
}) => {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.iconRing, styles.iconRingWarn]}>
        <Ionicons name="headset-outline" size={42} color={Colors.warning} />
      </View>

      <Text style={styles.title}>Connectez vos écouteurs</Text>

      <Text style={styles.subtitle}>
        Pour la fiabilité du test, branchez vos écouteurs (filaires ou Bluetooth).
      </Text>

      {/* Manual confirmation */}
      <Pressable
        onPress={() => setConfirmed(v => !v)}
        style={({ pressed }) => [
          styles.manualBox,
          confirmed && styles.manualBoxActive,
          pressed && styles.pressed,
        ]}
      >
        <View style={[
          styles.checkbox,
          confirmed && styles.checkboxChecked,
        ]}>
          {confirmed && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
        </View>
        <Text style={[
          styles.manualText,
          confirmed && styles.manualTextActive,
        ]}>
          Je confirme avoir des écouteurs connectés
        </Text>
      </Pressable>

      <View style={styles.actions}>
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
        >
          <Text style={styles.cancelText}>Annuler</Text>
        </Pressable>

        <Pressable
          onPress={onNext}
          disabled={!confirmed}
          style={({ pressed }) => [
            styles.nextBtn,
            confirmed ? styles.nextBtnEnabled : styles.nextBtnDisabled,
            pressed && confirmed && styles.pressed,
          ]}
        >
          <Text style={[
            styles.nextText,
            confirmed ? styles.nextTextEnabled : styles.nextTextDisabled,
          ]}>
            Suivant
          </Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color={confirmed ? '#FFFFFF' : Colors.textTertiary}
          />
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'center' },

  iconRing: {
    width: 92, height: 92,
    borderRadius: 46,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 18, marginBottom: 14,
    borderWidth: 2,
  },
  iconRingWarn: { backgroundColor: Colors.warningLight, borderColor: Colors.warning },

  title: {
    fontSize: 22, fontWeight: '800',
    color: Colors.text, letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14, color: Colors.textSecondary,
    textAlign: 'center', marginTop: 8, lineHeight: 20,
    paddingHorizontal: 8,
  },

  manualBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: 14,
    marginTop: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  manualBoxActive: {
    borderColor: Colors.success,
    backgroundColor: Colors.successLight,
  },
  checkbox: {
    width: 24, height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.textTertiary,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: Colors.success,
    backgroundColor: Colors.success,
  },
  manualText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  manualTextActive: {
    color: Colors.success,
    fontWeight: '700',
  },

  actions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 22,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  cancelText: {
    fontSize: 15, fontWeight: '700',
    color: Colors.textSecondary,
  },
  nextBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    ...Platform.select({
      ios:     { shadowColor: '#15803D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10 },
      android: { elevation: 4 },
    }),
  },
  nextBtnEnabled:  { backgroundColor: Colors.success },
  nextBtnDisabled: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  nextText:         { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  nextTextEnabled:  { color: '#FFFFFF' },
  nextTextDisabled: { color: Colors.textTertiary },

  pressed: { opacity: 0.85 },
});
