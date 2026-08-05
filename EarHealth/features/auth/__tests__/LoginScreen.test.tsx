import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';
import { mockThemeContext } from '../../../test-utils/mockTheme';

jest.mock('@/features/theme/ThemeContext', () => mockThemeContext);
jest.mock('../services/auth.service', () => ({ authService: { signIn: jest.fn() } }));

import { authService } from '../services/auth.service';
import LoginScreen from '../screens/LoginScreen';

const mockSignIn = authService.signIn as jest.Mock;

describe('LoginScreen', () => {
  beforeEach(() => {
    mockSignIn.mockReset();
    (router.push as jest.Mock).mockClear();
  });

  test('renders the login form', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Connexion')).toBeTruthy();
    expect(getByText('Se connecter')).toBeTruthy();
  });

  test('shows "Email requis." when submitting with an empty email', async () => {
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('Se connecter'));
    await waitFor(() => expect(getByText('Email requis.')).toBeTruthy());
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  test('shows "Email invalide." for a malformed email', async () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('votre@email.com'), 'not-an-email');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');
    fireEvent.press(getByText('Se connecter'));
    await waitFor(() => expect(getByText('Email invalide.')).toBeTruthy());
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  test('shows "Mot de passe requis." when the password is empty', async () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('votre@email.com'), 'a@b.com');
    fireEvent.press(getByText('Se connecter'));
    await waitFor(() => expect(getByText('Mot de passe requis.')).toBeTruthy());
  });

  test('calls authService.signIn with trimmed email and the password on valid input', async () => {
    mockSignIn.mockResolvedValue({ user: { id: 'u1' } });
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('votre@email.com'), '  a@b.com  ');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'secret123');
    fireEvent.press(getByText('Se connecter'));

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith('a@b.com', 'secret123'));
  });

  test('maps "Invalid login credentials" to a French message', async () => {
    mockSignIn.mockRejectedValue(new Error('Invalid login credentials'));
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('votre@email.com'), 'a@b.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'wrong');
    fireEvent.press(getByText('Se connecter'));

    await waitFor(() => expect(getByText('Email ou mot de passe incorrect.')).toBeTruthy());
  });

  test('maps "Email not confirmed" to a French message', async () => {
    mockSignIn.mockRejectedValue(new Error('Email not confirmed'));
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('votre@email.com'), 'a@b.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'secret123');
    fireEvent.press(getByText('Se connecter'));

    await waitFor(() => expect(getByText('Email non confirmé. Vérifiez votre boîte mail.')).toBeTruthy());
  });

  test('falls back to a generic message for an unrecognized error', async () => {
    mockSignIn.mockRejectedValue({});
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('votre@email.com'), 'a@b.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'secret123');
    fireEvent.press(getByText('Se connecter'));

    await waitFor(() => expect(getByText('Erreur de connexion. Réessayez.')).toBeTruthy());
  });

  test('navigates to registration when "Créer un compte" is pressed', () => {
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('Créer un compte'));
    expect(router.push).toHaveBeenCalledWith('/(auth)/register');
  });
});
