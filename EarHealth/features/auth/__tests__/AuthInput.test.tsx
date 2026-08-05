import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { AuthInput } from '../components/AuthInput';

describe('AuthInput', () => {
  test('renders the label', () => {
    const { getByText } = render(<AuthInput label="Email" />);
    expect(getByText('Email')).toBeTruthy();
  });

  test('does not render an error message by default', () => {
    const { queryByText } = render(<AuthInput label="Email" />);
    expect(queryByText('Email invalide.')).toBeNull();
  });

  test('renders the error message when provided', () => {
    const { getByText } = render(<AuthInput label="Email" error="Email invalide." />);
    expect(getByText('Email invalide.')).toBeTruthy();
  });

  test('does not show the eye toggle icon without secureToggle', () => {
    const { UNSAFE_queryAllByProps } = render(<AuthInput label="Mot de passe" secureTextEntry />);
    expect(UNSAFE_queryAllByProps({ name: 'eye-outline' })).toHaveLength(0);
    expect(UNSAFE_queryAllByProps({ name: 'eye-off-outline' })).toHaveLength(0);
  });

  test('secureToggle starts hidden (secureTextEntry true) and flips to visible when the eye icon is pressed', () => {
    const { getByTestId, UNSAFE_getByProps } = render(
      <AuthInput label="Mot de passe" secureToggle secureTextEntry testID="password-input" />,
    );
    expect(getByTestId('password-input').props.secureTextEntry).toBe(true);
    expect(UNSAFE_getByProps({ name: 'eye-outline' })).toBeTruthy();

    fireEvent.press(UNSAFE_getByProps({ name: 'eye-outline' }).parent!);

    expect(getByTestId('password-input').props.secureTextEntry).toBe(false);
    expect(UNSAFE_getByProps({ name: 'eye-off-outline' })).toBeTruthy();
  });

  test('forwards TextInput props like value and onChangeText', () => {
    const onChangeText = jest.fn();
    const { getByDisplayValue } = render(
      <AuthInput label="Email" value="a@b.com" onChangeText={onChangeText} />,
    );
    const input = getByDisplayValue('a@b.com');
    fireEvent.changeText(input, 'new@b.com');
    expect(onChangeText).toHaveBeenCalledWith('new@b.com');
  });
});
