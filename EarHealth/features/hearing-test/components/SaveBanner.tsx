import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { useThemeColors } from '@/features/theme/ThemeContext';
import type { HearingSaveStatus } from '../services/hearing.storage';

interface SaveBannerProps {
  status: HearingSaveStatus;
}

// Renders a small status banner above a result view, mirroring the quiz UI:
//   • 'saving' : primary tint, neutral copy
//   • 'saved'  : success tint (kept subtle — confirmation, not celebration)
//   • 'queued' : primary tint with cloud-offline icon, info copy
//   • 'error'  : warning tint with warning icon
//   • 'idle'   : renders nothing
export const SaveBanner: React.FC<SaveBannerProps> = ({ status }) => {
  const { colors: tierColors } = useThemeColors();
  if (status === 'idle') return null;

  if (status === 'saving') {
    return (
      <View style={[styles.base, { backgroundColor: tierColors.primaryLight }]}>
        <Text style={[styles.infoText, { color: tierColors.primaryDark }]}>Enregistrement…</Text>
      </View>
    );
  }

  if (status === 'saved') {
    return (
      <View style={[styles.base, styles.success]}>
        <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
        <Text style={styles.successText}>Résultat enregistré.</Text>
      </View>
    );
  }

  if (status === 'queued') {
    return (
      <View style={[styles.base, { backgroundColor: tierColors.primaryLight }]}>
        <Ionicons name="cloud-offline-outline" size={14} color={tierColors.primaryDark} />
        <Text style={[styles.infoText, { color: tierColors.primaryDark }]}>
          Enregistré localement. Sera synchronisé à la reconnexion.
        </Text>
      </View>
    );
  }

  // status === 'error'
  return (
    <View style={[styles.base, styles.error]}>
      <Ionicons name="warning-outline" size={14} color={Colors.warning} />
      <Text style={styles.errorText}>
        Échec de l’enregistrement. La progression locale est conservée.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
  },
  infoText:    { flex: 1, fontSize: 12, fontWeight: '600' },
  success:     { backgroundColor: Colors.successLight },
  successText: { flex: 1, fontSize: 12, color: Colors.success, fontWeight: '600' },
  error: {
    backgroundColor: Colors.warningLight,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  errorText:   { flex: 1, fontSize: 12, color: Colors.warning, fontWeight: '600' },
});
