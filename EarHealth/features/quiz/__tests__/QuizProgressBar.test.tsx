import { render } from '@testing-library/react-native';
import React from 'react';
import { mockThemeContext } from '../../../test-utils/mockTheme';

jest.mock('../../theme/ThemeContext', () => mockThemeContext);

import { QuizProgressBar } from '../components/QuizProgressBar';

describe('QuizProgressBar', () => {
  test('renders the current question number', () => {
    const { getByText } = render(<QuizProgressBar current={3} total={10} />);
    expect(getByText('Question 3')).toBeTruthy();
  });

  test('renders the current/total counter', () => {
    const { getByText } = render(<QuizProgressBar current={3} total={10} />);
    expect(getByText('3 / 10')).toBeTruthy();
  });

  test('renders without crashing on the last question', () => {
    expect(() => render(<QuizProgressBar current={10} total={10} />)).not.toThrow();
  });
});
