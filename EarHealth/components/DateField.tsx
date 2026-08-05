import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { useThemeColors } from '@/features/theme/ThemeContext';

interface DateFieldProps {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  error?: string;
  maximumDate?: Date;
}

export const DateField: React.FC<DateFieldProps> = ({
  label,
  value,
  onChange,
  error,
  maximumDate,
}) => {
  const { colors: tierColors } = useThemeColors();
  const [showPicker, setShowPicker] = useState(false);

  const handleChange = (_: DateTimePickerEvent, date?: Date) => {
    if (date) onChange(date);
  };

  // Android's DateTimePicker opens its own native Material dialog as soon as
  // it's mounted — it must not be wrapped in our custom bottom-sheet Modal,
  // which is an iOS-only pattern for the spinner display.
  const handleAndroidChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowPicker(false);
    if (event.type === 'set' && date) onChange(date);
  };

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable style={styles.dateBtn} onPress={() => setShowPicker(true)}>
        <Text style={styles.dateBtnText}>
          {value.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={Colors.textTertiary} />
      </Pressable>
      {error ? <Text style={styles.errorInline}>{error}</Text> : null}

      {Platform.OS === 'android' ? (
        showPicker && (
          <DateTimePicker
            value={value}
            mode="date"
            display="calendar"
            onChange={handleAndroidChange}
            maximumDate={maximumDate ?? new Date()}
          />
        )
      ) : (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPicker(false)}
        >
          <Pressable style={styles.overlay} onPress={() => setShowPicker(false)} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <Pressable onPress={() => setShowPicker(false)} hitSlop={8}>
                <Text style={[styles.sheetDone, { color: tierColors.primary }]}>Confirmer</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={value}
              mode="date"
              display="spinner"
              onChange={handleChange}
              maximumDate={maximumDate ?? new Date()}
              locale="fr-FR"
              style={styles.datePicker}
              textColor={Colors.text}
            />
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fieldBlock: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 7, letterSpacing: 0.1 },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderRadius: 12, borderColor: Colors.border,
    backgroundColor: Colors.surface, paddingHorizontal: 14, paddingVertical: 13,
  },
  dateBtnText: { fontSize: 15, color: Colors.text },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  sheetDone: { fontSize: 16, fontWeight: '700' },
  datePicker: { width: '100%' },
  errorInline: { fontSize: 12, color: Colors.error, marginTop: 6, fontWeight: '500' },
});
