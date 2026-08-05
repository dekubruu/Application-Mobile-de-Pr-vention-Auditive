import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { Colors } from '../constants/colors';
import { useThemeColors } from '../features/theme/ThemeContext';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'lg' | 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  size = 'md',
  style,
  textStyle,
  disabled = false,
}) => {
  const { colors: tierColors } = useThemeColors();
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 2 }).start();

  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 2 }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        style={[
          styles.base,
          variant === 'primary' && { backgroundColor: tierColors.primary },
          variant === 'secondary' && [styles.secondary, { borderColor: tierColors.primary }],
          variant === 'ghost' && styles.ghost,
          variant === 'danger' && styles.danger,
          size === 'lg' && styles.lg,
          size === 'md' && styles.md,
          size === 'sm' && styles.sm,
          disabled && styles.disabled,
        ]}
      >
        <Text
          style={[
            styles.label,
            variant === 'primary' && styles.labelPrimary,
            (variant === 'secondary' || variant === 'ghost') && { color: tierColors.primary },
            variant === 'danger' && styles.labelPrimary,
            size === 'sm' && styles.labelSm,
            textStyle,
          ]}
        >
          {title}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondary: { backgroundColor: 'transparent', borderWidth: 1.5 },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: Colors.error },
  lg: { paddingVertical: 16, paddingHorizontal: 28, minHeight: 56 },
  md: { paddingVertical: 13, paddingHorizontal: 24, minHeight: 48 },
  sm: { paddingVertical: 9, paddingHorizontal: 16, minHeight: 36 },
  disabled: { opacity: 0.45 },
  label: { fontSize: 16, fontWeight: '600', letterSpacing: 0.1 },
  labelPrimary: { color: '#FFFFFF' },
  labelSm: { fontSize: 14 },
});
