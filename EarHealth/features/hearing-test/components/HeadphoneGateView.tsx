import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';

interface HeadphoneGateViewProps {
  detected:   boolean;
  label?:     string | null;
  onNext:     () => void;
  onCancel:   () => void;
  onRecheck:  () => void;
}

export const HeadphoneGateView: React.FC<HeadphoneGateViewProps> = ({
  detected,
  label,
  onNext,
  onCancel,
  onRecheck,
}) => {
  const [manuallyConfirmed, setManuallyConfirmed] = useState(false);
  const canProceed = detected || manuallyConfirmed;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[
        styles.iconRing,
        detected ? styles.iconRingOk : styles.iconRingWarn,
      ]}>
        <Ionicons
          name={detected ? 'headset' : 'headset-outline'}
          size={42}
          color={detected ? Colors.success : Colors.warning}
        />
      </View>

      <Text style={styles.title}>
        {detected ? 'Écouteurs détectés' : 'Connectez vos écouteurs'}
      </Text>

      <Text style={styles.subtitle}>
        {detected
          ? 'Vous pouvez démarrer le test.'
          : 'Pour la fiabilité du test, branchez vos écouteurs (filaires ou Bluetooth).'}
      </Text>

      {detected && label && (
        <View style={styles.labelBadge}>
          <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
          <Text style={styles.labelBadgeText} numberOfLines={1}>{label}</Text>
        </View>
      )}

      {!detected && (
        <>
          <View style={styles.tipBox}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.primaryDark} />
            <Text style={styles.tipText}>
              La détection automatique du <Text style={styles.bold}>Bluetooth</Text> n’est pas toujours
              fiable. Si vos écouteurs sans fil sont connectés, confirmez ci-dessous.
            </Text>
          </View>

          <Pressable onPress={onRecheck} style={styles.recheckBtn} hitSlop={6}>
            <Ionicons name="refresh" size={16} color={Colors.primary} />
            <Text style={styles.recheckText}>Re-tester la détection</Text>
          </Pressable>

          {/* Manual confirmation */}
          <Pressable
            onPress={() => setManuallyConfirmed(v => !v)}
            style={({ pressed }) => [
              styles.manualBox,
              manuallyConfirmed && styles.manualBoxActive,
              pressed && styles.pressed,
            ]}
          >
            <View style={[
              styles.checkbox,
              manuallyConfirmed && styles.checkboxChecked,
            ]}>
              {manuallyConfirmed && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
            <Text style={[
              styles.manualText,
              manuallyConfirmed && styles.manualTextActive,
            ]}>
              Je confirme avoir des écouteurs connectés
            </Text>
          </Pressable>
        </>
      )}

      <View style={styles.actions}>
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
        >
          <Text style={styles.cancelText}>Annuler</Text>
        </Pressable>

        <Pressable
          onPress={onNext}
          disabled={!canProceed}
          style={({ pressed }) => [
            styles.nextBtn,
            canProceed ? styles.nextBtnEnabled : styles.nextBtnDisabled,
            pressed && canProceed && styles.pressed,
          ]}
        >
          <Text style={[
            styles.nextText,
            canProceed ? styles.nextTextEnabled : styles.nextTextDisabled,
          ]}>
            Suivant
          </Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color={canProceed ? '#FFFFFF' : Colors.textTertiary}
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
  iconRingOk:   { backgroundColor: Colors.successLight, borderColor: Colors.success },
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

  labelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.successLight,
    borderRadius: 14,
    maxWidth: '90%',
  },
  labelBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.success, flexShrink: 1 },

  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    marginTop: 18,
    width: '100%',
  },
  tipText: { flex: 1, fontSize: 12, color: Colors.primaryDark, lineHeight: 18, fontWeight: '500' },
  bold:    { fontWeight: '800' },

  recheckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    marginTop: 12,
  },
  recheckText: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  manualBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: 14,
    marginTop: 14,
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
