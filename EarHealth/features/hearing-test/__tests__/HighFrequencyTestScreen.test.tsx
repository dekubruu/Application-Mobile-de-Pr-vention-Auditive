import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';
import { Alert } from 'react-native';
import { mockAuthModule } from '../../../test-utils/mockAuth';
import { mockThemeContext } from '../../../test-utils/mockTheme';

jest.mock('@/features/theme/ThemeContext', () => mockThemeContext);
jest.mock('@/features/auth/hooks/useAuth', () => mockAuthModule);

jest.mock('../audio/AudioEngine', () => {
  const ReactActual = require('react');
  const AudioEngine = ReactActual.forwardRef((props: any, ref: any) => {
    ReactActual.useImperativeHandle(ref, () => ({
      playTone: jest.fn(), stopTone: jest.fn(), setVolume: jest.fn(), setFrequency: jest.fn(),
    }));
    ReactActual.useEffect(() => { props.onReady?.(); }, []);
    return null;
  });
  return { AudioEngine };
});

const mockUseHighFrequencyTest = jest.fn();
jest.mock('../hooks/useHighFrequencyTest', () => ({
  useHighFrequencyTest: (...args: unknown[]) => mockUseHighFrequencyTest(...args),
}));

jest.mock('../hooks/usePreviousHFRTResult', () => ({
  usePreviousHFRTResult: jest.fn(() => null),
}));

jest.mock('../components/HFRTResultView', () => {
  const ReactActual = require('react');
  const { Text } = require('react-native');
  return {
    HFRTResultView: ({ result }: { result: { maxAudibleFrequency: number } }) =>
      ReactActual.createElement(Text, null, `Résultat: ${result.maxAudibleFrequency} Hz`),
  };
});

import HighFrequencyTestScreen from '../HighFrequencyTestScreen';

function baseHookReturn(overrides: Record<string, unknown> = {}) {
  return {
    stage: 'intro',
    currentFreq: 8000,
    reversalCount: 0,
    isHeld: false,
    inactiveWarn: false,
    result: null,
    saveStatus: 'idle',
    start: jest.fn(),
    cancel: jest.fn(),
    reset: jest.fn(),
    onHoldStart: jest.fn(),
    onHoldEnd: jest.fn(),
    ...overrides,
  };
}

function passGate(utils: ReturnType<typeof render>) {
  fireEvent.press(utils.getByText('Je confirme avoir des écouteurs connectés'));
  fireEvent.press(utils.getByText('Suivant'));
}

describe('HighFrequencyTestScreen', () => {
  beforeEach(() => {
    mockUseHighFrequencyTest.mockReset();
    mockUseHighFrequencyTest.mockReturnValue(baseHookReturn());
    (router.back as jest.Mock).mockClear();
  });

  test('shows the headphone gate before the intro', () => {
    const { getByText } = render(<HighFrequencyTestScreen />);
    expect(getByText('Connectez vos écouteurs')).toBeTruthy();
  });

  test('shows the intro screen and starts the test on CTA press', () => {
    const hook = baseHookReturn();
    mockUseHighFrequencyTest.mockReturnValue(hook);
    const utils = render(<HighFrequencyTestScreen />);
    passGate(utils);

    expect(utils.getByText('Commencer le test')).toBeTruthy();
    fireEvent.press(utils.getByText('Commencer le test'));
    expect(hook.start).toHaveBeenCalledTimes(1);
  });

  test('renders the testing view during the testing stage', () => {
    mockUseHighFrequencyTest.mockReturnValue(baseHookReturn({ stage: 'testing', currentFreq: 12000 }));
    const utils = render(<HighFrequencyTestScreen />);
    passGate(utils);

    expect(utils.getByText('FRÉQUENCE COURANTE')).toBeTruthy();
  });

  test('renders nothing extra when the stage is "result" but no result is available yet', () => {
    mockUseHighFrequencyTest.mockReturnValue(baseHookReturn({ stage: 'result', result: null }));
    const utils = render(<HighFrequencyTestScreen />);
    passGate(utils);

    expect(utils.queryByText('Refaire')).toBeNull();
    expect(utils.queryByText('Terminer')).toBeNull();
  });

  test('shows the result view with the save banner and wires "Refaire"/"Terminer"', () => {
    const hook = baseHookReturn({
      stage: 'result',
      saveStatus: 'queued',
      result: { maxAudibleFrequency: 15000, reliable: true, durationMs: 4000, hitCeiling: false, noResponse: false, reversals: 8 },
    });
    mockUseHighFrequencyTest.mockReturnValue(hook);
    const utils = render(<HighFrequencyTestScreen />);
    passGate(utils);

    expect(utils.getByText('Enregistré localement. Sera synchronisé à la reconnexion.')).toBeTruthy();
    expect(utils.getByText('Résultat: 15000 Hz')).toBeTruthy();

    fireEvent.press(utils.getByText('Refaire'));
    expect(hook.reset).toHaveBeenCalledTimes(1);

    fireEvent.press(utils.getByText('Terminer'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  test('leaving mid-test asks for confirmation, and cancels + exits when confirmed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      const destructive = buttons?.find(b => b.style === 'destructive');
      destructive?.onPress?.();
    });
    const hook = baseHookReturn({ stage: 'testing' });
    mockUseHighFrequencyTest.mockReturnValue(hook);
    const utils = render(<HighFrequencyTestScreen />);
    passGate(utils);

    fireEvent.press(utils.UNSAFE_getByProps({ name: 'chevron-back' }).parent!);

    expect(alertSpy).toHaveBeenCalledWith(
      'Quitter le test ?',
      expect.any(String),
      expect.any(Array),
    );
    expect(hook.cancel).toHaveBeenCalledTimes(1);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  test('leaving mid-test does not cancel when the confirmation is dismissed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      const cancelBtn = buttons?.find(b => b.style === 'cancel');
      cancelBtn?.onPress?.();
    });
    const hook = baseHookReturn({ stage: 'testing' });
    mockUseHighFrequencyTest.mockReturnValue(hook);
    const utils = render(<HighFrequencyTestScreen />);
    passGate(utils);

    fireEvent.press(utils.UNSAFE_getByProps({ name: 'chevron-back' }).parent!);

    expect(alertSpy).toHaveBeenCalled();
    expect(hook.cancel).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  test('leaving from the intro stage exits immediately without a confirmation', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const utils = render(<HighFrequencyTestScreen />);
    passGate(utils);

    fireEvent.press(utils.UNSAFE_getByProps({ name: 'chevron-back' }).parent!);

    expect(alertSpy).not.toHaveBeenCalled();
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  test('cancelling from the headphone gate exits without passing it', () => {
    const utils = render(<HighFrequencyTestScreen />);
    fireEvent.press(utils.getByText('Annuler'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
