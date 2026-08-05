import { render } from '@testing-library/react-native';
import React from 'react';
import { SoundLevelBar } from '../components/SoundLevelBar';

describe('SoundLevelBar', () => {
  test('renders without crashing at a low sound level', () => {
    expect(() => render(<SoundLevelBar soundLevel={20} />)).not.toThrow();
  });

  test('renders without crashing at a dangerous sound level', () => {
    expect(() => render(<SoundLevelBar soundLevel={130} />)).not.toThrow();
  });

  test('renders without crashing for a negative reading (mic calibration noise)', () => {
    expect(() => render(<SoundLevelBar soundLevel={-5} />)).not.toThrow();
  });
});
