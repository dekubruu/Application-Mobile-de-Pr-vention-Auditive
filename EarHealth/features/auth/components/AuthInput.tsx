import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Colors } from '@/constants/colors';

interface AuthInputProps extends TextInputProps {
  label: string;
  error?: string;
  secureToggle?: boolean;
}

export const AuthInput: React.FC<AuthInputProps> = ({
  label,
  error,
  secureToggle,
  style,
  ...props
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.row, error ? styles.rowError : styles.rowNormal]}>
        <TextInput
          {...props}
          secureTextEntry={secureToggle ? !visible : props.secureTextEntry}
          style={[styles.input, style]}
          placeholderTextColor={Colors.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {secureToggle && (
          <Pressable onPress={() => setVisible(v => !v)} hitSlop={8} style={styles.eye}>
            <Ionicons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Colors.textTertiary}
            />
          </Pressable>
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 7,
    letterSpacing: 0.1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
  },
  rowNormal: {
    borderColor: Colors.border,
  },
  rowError: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 13,
  },
  eye: {
    paddingLeft: 8,
  },
  errorText: {
    marginTop: 5,
    fontSize: 12,
    color: Colors.error,
  },
});
