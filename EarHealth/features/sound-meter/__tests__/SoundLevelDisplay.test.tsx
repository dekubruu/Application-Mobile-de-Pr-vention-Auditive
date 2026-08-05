import { render } from '@testing-library/react-native';
import React from 'react';
import { getSoundLevelCategory } from '../constants/sound-level.constants';
import { SoundLevelDisplay } from '../components/SoundLevelDisplay';

describe('SoundLevelDisplay', () => {
  test('renders the current level, its unit and the average', () => {
    const category = getSoundLevelCategory(55);
    const { getByText } = render(
      <SoundLevelDisplay soundLevel={55} averageLevel={48} category={category} />,
    );
    expect(getByText('55')).toBeTruthy();
    expect(getByText('dB')).toBeTruthy();
    expect(getByText('Moyenne : 48 dB')).toBeTruthy();
  });

  test('renders the category label as a badge', () => {
    const category = getSoundLevelCategory(90);
    const { getByText } = render(
      <SoundLevelDisplay soundLevel={90} averageLevel={90} category={category} />,
    );
    expect(getByText('Nocif')).toBeTruthy();
  });

  test('renders without crashing for a dangerous level', () => {
    const category = getSoundLevelCategory(130);
    expect(() =>
      render(<SoundLevelDisplay soundLevel={130} averageLevel={110} category={category} />),
    ).not.toThrow();
  });
});
