import { Platform } from 'react-native';

export const Spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const Shadow = {
  sm: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
    android: { elevation: 2 },
    default: {},
  }) as object,
  md: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.10, shadowRadius: 10 },
    android: { elevation: 5 },
    default: {},
  }) as object,
  lg: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 20 },
    android: { elevation: 10 },
    default: {},
  }) as object,
} as const;
