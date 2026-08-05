import { render } from '@testing-library/react-native';
import React from 'react';
import { mockThemeContext } from '../../../test-utils/mockTheme';

jest.mock('../../theme/ThemeContext', () => mockThemeContext);

import { StatsGrid } from '../components/StatsGrid';

describe('StatsGrid', () => {
  test('renders the three stat values and their labels', () => {
    const { getByText } = render(<StatsGrid hearingTests={5} quizSessions={3} points={120} />);
    expect(getByText('5')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
    expect(getByText('120')).toBeTruthy();
    expect(getByText('Tests auditifs')).toBeTruthy();
    expect(getByText('Quiz')).toBeTruthy();
    expect(getByText('Points actuel')).toBeTruthy();
  });

  test('renders zero values without crashing', () => {
    const { getAllByText } = render(<StatsGrid hearingTests={0} quizSessions={0} points={0} />);
    expect(getAllByText('0')).toHaveLength(3);
  });
});
