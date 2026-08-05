import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { mockThemeContext } from '../../../test-utils/mockTheme';

jest.mock('../../theme/ThemeContext', () => mockThemeContext);

import { QuizDifficultyPicker } from '../components/QuizDifficultyPicker';

describe('QuizDifficultyPicker', () => {
  test('renders all four difficulty options', () => {
    const { getByText } = render(<QuizDifficultyPicker value="mixed" onChange={jest.fn()} />);
    expect(getByText('Mixte')).toBeTruthy();
    expect(getByText('Facile')).toBeTruthy();
    expect(getByText('Moyen')).toBeTruthy();
    expect(getByText('Difficile')).toBeTruthy();
  });

  test('shows the points hint for each difficulty', () => {
    const { getByText } = render(<QuizDifficultyPicker value="mixed" onChange={jest.fn()} />);
    expect(getByText('10 pts')).toBeTruthy();
    expect(getByText('20 pts')).toBeTruthy();
    expect(getByText('30 pts')).toBeTruthy();
  });

  test('calls onChange with the pressed difficulty id', () => {
    const onChange = jest.fn();
    const { getByText } = render(<QuizDifficultyPicker value="mixed" onChange={onChange} />);
    fireEvent.press(getByText('Difficile'));
    expect(onChange).toHaveBeenCalledWith('hard');
  });
});
