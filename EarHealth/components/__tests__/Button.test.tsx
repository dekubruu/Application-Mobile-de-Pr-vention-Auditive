import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { mockThemeContext } from '../../test-utils/mockTheme';

jest.mock('../../features/theme/ThemeContext', () => mockThemeContext);

import { Button } from '../Button';

describe('Button', () => {
  test('renders the given title', () => {
    const { getByText } = render(<Button title="Continuer" onPress={jest.fn()} />);
    expect(getByText('Continuer')).toBeTruthy();
  });

  test('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Valider" onPress={onPress} />);

    fireEvent.press(getByText('Valider'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Valider" onPress={onPress} disabled />);

    fireEvent.press(getByText('Valider'));

    expect(onPress).not.toHaveBeenCalled();
  });

  test('renders with a ghost variant without altering the title text', () => {
    const { getByText } = render(<Button title="Annuler" onPress={jest.fn()} variant="ghost" />);
    expect(getByText('Annuler')).toBeTruthy();
  });
});
