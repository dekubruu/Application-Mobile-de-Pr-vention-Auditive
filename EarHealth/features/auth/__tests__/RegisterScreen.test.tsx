import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';
import { mockThemeContext } from '../../../test-utils/mockTheme';

jest.mock('@/features/theme/ThemeContext', () => mockThemeContext);
jest.mock('../services/auth.service', () => ({ authService: { signUp: jest.fn() } }));

import { authService } from '../services/auth.service';
import RegisterScreen from '../screens/RegisterScreen';

const mockSignUp = authService.signUp as jest.Mock;

// Fills in every field except the one under test, so each validation test
// isolates a single failure instead of tripping every required-field error.
function fillValidFormExcept(
  utils: ReturnType<typeof render>,
  skip: 'username' | 'gender' | 'email' | 'password' | 'confirmPassword' | 'none' = 'none',
) {
  const { getByPlaceholderText, getByText } = utils;
  if (skip !== 'username') fireEvent.changeText(getByPlaceholderText('ex: johndoe'), 'johndoe');
  if (skip !== 'gender') fireEvent.press(getByText('Homme'));
  if (skip !== 'email') fireEvent.changeText(getByPlaceholderText('votre@email.com'), 'a@b.com');
  if (skip !== 'password') fireEvent.changeText(getByPlaceholderText('Minimum 6 caractères'), 'secret1');
  if (skip !== 'confirmPassword') fireEvent.changeText(getByPlaceholderText('••••••••'), 'secret1');
}

describe('RegisterScreen', () => {
  beforeEach(() => {
    mockSignUp.mockReset();
    (router.back as jest.Mock).mockClear();
    (router.replace as jest.Mock).mockClear();
  });

  test('renders the registration form', () => {
    const { getByText } = render(<RegisterScreen />);
    expect(getByText('Créer un compte')).toBeTruthy();
  });

  test('requires a username of at least 3 characters', async () => {
    const utils = render(<RegisterScreen />);
    fillValidFormExcept(utils, 'username');
    fireEvent.changeText(utils.getByPlaceholderText('ex: johndoe'), 'jo');
    fireEvent.press(utils.getByText('Créer mon compte'));
    await waitFor(() => expect(utils.getByText('Minimum 3 caractères.')).toBeTruthy());
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  test('requires a gender selection', async () => {
    const utils = render(<RegisterScreen />);
    fillValidFormExcept(utils, 'gender');
    fireEvent.press(utils.getByText('Créer mon compte'));
    await waitFor(() => expect(utils.getByText('Veuillez sélectionner votre genre.')).toBeTruthy());
  });

  test('requires a valid email format', async () => {
    const utils = render(<RegisterScreen />);
    fillValidFormExcept(utils, 'email');
    fireEvent.changeText(utils.getByPlaceholderText('votre@email.com'), 'not-an-email');
    fireEvent.press(utils.getByText('Créer mon compte'));
    await waitFor(() => expect(utils.getByText('Email invalide.')).toBeTruthy());
  });

  test('requires a password of at least 6 characters', async () => {
    const utils = render(<RegisterScreen />);
    fillValidFormExcept(utils, 'password');
    fireEvent.changeText(utils.getByPlaceholderText('Minimum 6 caractères'), 'abc');
    fireEvent.changeText(utils.getByPlaceholderText('••••••••'), 'abc');
    fireEvent.press(utils.getByText('Créer mon compte'));
    await waitFor(() => expect(utils.getByText('Minimum 6 caractères.')).toBeTruthy());
  });

  test('requires matching password confirmation', async () => {
    const utils = render(<RegisterScreen />);
    fillValidFormExcept(utils, 'confirmPassword');
    fireEvent.changeText(utils.getByPlaceholderText('••••••••'), 'different');
    fireEvent.press(utils.getByText('Créer mon compte'));
    await waitFor(() => expect(utils.getByText('Les mots de passe ne correspondent pas.')).toBeTruthy());
  });

  test('signs up with the form data and shows the success screen when no session is returned (email confirmation required)', async () => {
    mockSignUp.mockResolvedValue({ session: null });
    const utils = render(<RegisterScreen />);
    fillValidFormExcept(utils);
    fireEvent.press(utils.getByText('Créer mon compte'));

    await waitFor(() => expect(mockSignUp).toHaveBeenCalledWith(
      'a@b.com', 'secret1', 'johndoe', expect.any(String), 'male',
    ));
    await waitFor(() => expect(utils.getByText('Compte créé !')).toBeTruthy());
  });

  test('maps "already registered" to a French duplicate-email message', async () => {
    mockSignUp.mockRejectedValue(new Error('User already registered'));
    const utils = render(<RegisterScreen />);
    fillValidFormExcept(utils);
    fireEvent.press(utils.getByText('Créer mon compte'));

    await waitFor(() => expect(utils.getByText('Cet email est déjà utilisé.')).toBeTruthy());
  });

  test('back button navigates back', () => {
    const { UNSAFE_getByProps } = render(<RegisterScreen />);
    fireEvent.press(UNSAFE_getByProps({ name: 'arrow-back' }).parent!);
    expect(router.back).toHaveBeenCalled();
  });

  test('"Se connecter" link replaces navigation to the login screen', () => {
    const { getByText } = render(<RegisterScreen />);
    fireEvent.press(getByText('Se connecter'));
    expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
  });
});
