import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';
import { Alert } from 'react-native';
import { mockThemeContext } from '../../../test-utils/mockTheme';

jest.mock('@/features/theme/ThemeContext', () => mockThemeContext);

jest.mock('../ExportSheet', () => ({ ExportSheet: () => null }));
jest.mock('../ThemeSheet', () => ({ ThemeSheet: () => null }));

jest.mock('@/features/auth/services/auth.service', () => ({
  authService: { deleteAccount: jest.fn() },
}));
jest.mock('@/features/auth/services/profile.service', () => ({
  profileService: { updateProfile: jest.fn() },
}));

const mockUseProfileData = jest.fn();
jest.mock('../hooks/useProfileData', () => ({
  useProfileData: () => mockUseProfileData(),
}));

import { authService } from '@/features/auth/services/auth.service';
import ProfileScreen from '../ProfileScreen';

const mockDeleteAccount = authService.deleteAccount as jest.Mock;

function baseProfileData(overrides: Record<string, unknown> = {}) {
  return {
    profile: {
      id: 'u1', username: 'Alice', date_of_birth: null, gender: null,
      total_points: 100, active_theme: 'default',
      created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
    },
    session: { user: { id: 'u1', email: 'alice@test.com' } },
    testsCount: 3,
    loadingStats: false,
    refreshProfile: jest.fn(),
    signOut: jest.fn(),
    quizSessionsPlayed: 2,
    ...overrides,
  };
}

// Auto-presses the button matching `style` in the Alert.alert buttons array.
function autoPressAlertButton(style: 'destructive' | 'cancel') {
  return jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
    buttons?.find(b => b.style === style)?.onPress?.();
  });
}

describe('ProfileScreen — account deletion', () => {
  beforeEach(() => {
    mockDeleteAccount.mockReset();
    mockUseProfileData.mockReturnValue(baseProfileData());
    (router.replace as jest.Mock).mockClear();
  });

  test('renders the "Supprimer mon compte" row', () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('Supprimer mon compte')).toBeTruthy();
  });

  test('asks for confirmation before deleting anything', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByText } = render(<ProfileScreen />);

    fireEvent.press(getByText('Supprimer mon compte'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Supprimer votre compte ?',
      expect.any(String),
      expect.any(Array),
    );
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  test('does nothing when the confirmation is dismissed', () => {
    autoPressAlertButton('cancel');
    const { getByText } = render(<ProfileScreen />);

    fireEvent.press(getByText('Supprimer mon compte'));

    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  test('deletes the account, signs out, and redirects to login when confirmed', async () => {
    mockDeleteAccount.mockResolvedValue(undefined);
    autoPressAlertButton('destructive');
    const signOut = jest.fn();
    mockUseProfileData.mockReturnValue(baseProfileData({ signOut }));

    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('Supprimer mon compte'));

    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
  });

  test('shows an error alert and does not sign out when the deletion fails', async () => {
    mockDeleteAccount.mockRejectedValue(new Error('network error'));
    const signOut = jest.fn();
    mockUseProfileData.mockReturnValue(baseProfileData({ signOut }));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((title, _msg, buttons) => {
      if (title === 'Supprimer votre compte ?') {
        buttons?.find(b => b.style === 'destructive')?.onPress?.();
      }
    });

    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('Supprimer mon compte'));

    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Erreur', expect.any(String)));
    expect(signOut).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
