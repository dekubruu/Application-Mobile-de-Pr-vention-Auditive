import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { mockThemeContext } from '../../test-utils/mockTheme';

jest.mock('../../features/theme/ThemeContext', () => mockThemeContext);

import { GenderSelector } from '../GenderSelector';

describe('GenderSelector', () => {
  test('renders both options with the default label', () => {
    const { getByText } = render(<GenderSelector value="" onChange={jest.fn()} />);
    expect(getByText('Genre')).toBeTruthy();
    expect(getByText('Homme')).toBeTruthy();
    expect(getByText('Femme')).toBeTruthy();
  });

  test('renders a custom label when provided', () => {
    const { getByText } = render(<GenderSelector value="" onChange={jest.fn()} label="Sexe" />);
    expect(getByText('Sexe')).toBeTruthy();
  });

  test('calls onChange with "male" when Homme is pressed', () => {
    const onChange = jest.fn();
    const { getByText } = render(<GenderSelector value="" onChange={onChange} />);
    fireEvent.press(getByText('Homme'));
    expect(onChange).toHaveBeenCalledWith('male');
  });

  test('calls onChange with "female" when Femme is pressed', () => {
    const onChange = jest.fn();
    const { getByText } = render(<GenderSelector value="male" onChange={onChange} />);
    fireEvent.press(getByText('Femme'));
    expect(onChange).toHaveBeenCalledWith('female');
  });

  test('renders the error message when provided', () => {
    const { getByText } = render(<GenderSelector value="" onChange={jest.fn()} error="Champ requis." />);
    expect(getByText('Champ requis.')).toBeTruthy();
  });
});
