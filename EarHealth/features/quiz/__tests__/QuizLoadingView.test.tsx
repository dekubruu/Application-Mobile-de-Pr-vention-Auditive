import { render } from '@testing-library/react-native';
import React from 'react';
import { mockThemeContext } from '../../../test-utils/mockTheme';

jest.mock('../../theme/ThemeContext', () => mockThemeContext);

import { QuizLoadingView } from '../components/QuizLoadingView';

describe('QuizLoadingView', () => {
  test('renders the loading title and subtitle', () => {
    const { getByText } = render(<QuizLoadingView />);
    expect(getByText('Chargement du quiz…')).toBeTruthy();
    expect(getByText('Sélection de questions au hasard.')).toBeTruthy();
  });

  test('renders without crashing', () => {
    expect(() => render(<QuizLoadingView />)).not.toThrow();
  });
});
