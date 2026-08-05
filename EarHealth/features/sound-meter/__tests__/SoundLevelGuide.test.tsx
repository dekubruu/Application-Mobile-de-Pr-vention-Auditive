import { render } from '@testing-library/react-native';
import React from 'react';
import { RISK_THRESHOLD_DB, SOUND_LEVEL_GUIDE } from '../constants/sound-level.constants';
import { SoundLevelGuide } from '../components/SoundLevelGuide';

describe('SoundLevelGuide', () => {
  test('renders the guide title', () => {
    const { getByText } = render(<SoundLevelGuide />);
    expect(getByText('Guide des niveaux sonores')).toBeTruthy();
  });

  test('renders the risk threshold value', () => {
    const { getByText } = render(<SoundLevelGuide />);
    expect(getByText(`${RISK_THRESHOLD_DB} dB`)).toBeTruthy();
  });

  test('renders every entry from SOUND_LEVEL_GUIDE', () => {
    const { getByText } = render(<SoundLevelGuide />);
    for (const entry of SOUND_LEVEL_GUIDE) {
      expect(getByText(entry.text)).toBeTruthy();
    }
  });
});
