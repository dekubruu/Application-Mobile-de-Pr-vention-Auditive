// Shared mock for `useThemeColors()`, used by any component/screen test that
// renders something depending on the active color tier. Mocking the hook
// directly (rather than mounting the real ThemeProvider, which itself needs
// AuthProvider + a live Supabase session) keeps component tests isolated to
// the component's own behavior.
//
// Usage in a test file:
//   jest.mock('@/features/theme/ThemeContext', () => require('../../../test-utils/mockTheme').mockThemeContext);

import type { ReactNode } from 'react';

export const defaultTierColors = {
  primary:      '#0B7285',
  primaryDark:  '#155E75',
  primaryLight: '#E0F2F7',
  primaryMid:   '#0D8FA5',
  gradient:     ['#0D8FA5', '#0B7285', '#064E5F'] as [string, string, string],
};

export const mockUseThemeColors = jest.fn(() => ({
  tier: 'default' as const,
  colors: defaultTierColors,
  ownedTiers: ['default'] as const,
  nextTier: 'bronze' as const,
  purchaseTier: jest.fn(),
  selectTier: jest.fn(),
}));

export const mockThemeContext = {
  useThemeColors: mockUseThemeColors,
  ThemeProvider: ({ children }: { children: ReactNode }) => children,
};
