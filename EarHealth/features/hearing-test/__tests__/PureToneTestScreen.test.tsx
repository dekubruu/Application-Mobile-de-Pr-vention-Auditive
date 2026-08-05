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

const mockUsePureToneTest = jest.fn();
jest.mock('../hooks/usePureToneTest', () => ({
  usePureToneTest: (...args: unknown[]) => mockUsePureToneTest(...args),
}));

jest.mock('../hooks/usePreviousPTTResult', () => ({
  usePreviousPTTResult: jest.fn(() => null),
}));

jest.mock('../components/PTTResultView', () => {
  const ReactActual = require('react');
  const { Text } = require('react-native');
  return {
    PTTResultView: ({ earResults }: { earResults: unknown[] }) =>
      ReactActual.createElement(Text, null, `Résultats: ${earResults.length} oreille(s)`),
  };
});

import PureToneTestScreen from '../PureToneTestScreen';

function baseHookReturn(overrides: Record<string, unknown> = {}) {
  return {
    stage: 'intro',
    currentEar: 'left',
    freqIndex: 0,
    totalFreqs: 4,
    currentFrequency: 500,
    currentDb: 40,
    isHeld: false,
    isPulsing: false,
    inactiveWarn: false,
    completedFreqs: [],
    earResults: [],
    saveStatus: 'idle',
    start: jest.fn(),
    startRightEar: jest.fn(),
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

describe('PureToneTestScreen', () => {
  beforeEach(() => {
    mockUsePureToneTest.mockReset();
    mockUsePureToneTest.mockReturnValue(baseHookReturn());
    (router.back as jest.Mock).mockClear();
  });

  test('shows the headphone gate before the intro', () => {
    const { getByText } = render(<PureToneTestScreen />);
    expect(getByText('Connectez vos écouteurs')).toBeTruthy();
  });

  test('shows the intro screen and starts the test on CTA press', () => {
    const hook = baseHookReturn();
    mockUsePureToneTest.mockReturnValue(hook);
    const utils = render(<PureToneTestScreen />);
    passGate(utils);

    expect(utils.getByText('Commencer (oreille gauche)')).toBeTruthy();
    fireEvent.press(utils.getByText('Commencer (oreille gauche)'));
    expect(hook.start).toHaveBeenCalledTimes(1);
  });

  test('renders the testing view for the current ear during the testing stage', () => {
    mockUsePureToneTest.mockReturnValue(baseHookReturn({ stage: 'testing', currentEar: 'left' }));
    const utils = render(<PureToneTestScreen />);
    passGate(utils);

    expect(utils.getByText('OREILLE GAUCHE')).toBeTruthy();
  });

  test('shows the between-ears transition and starts the right ear on press', () => {
    const hook = baseHookReturn({ stage: 'between-ears' });
    mockUsePureToneTest.mockReturnValue(hook);
    const utils = render(<PureToneTestScreen />);
    passGate(utils);

    fireEvent.press(utils.getByText('Continuer (oreille droite)'));
    expect(hook.startRightEar).toHaveBeenCalledTimes(1);
  });

  test('shows the result view with the save banner and wires "Refaire"/"Terminer"', () => {
    const hook = baseHookReturn({
      stage: 'result',
      saveStatus: 'saved',
      earResults: [{ ear: 'left', avgDb: 10, thresholds: [] }, { ear: 'right', avgDb: 12, thresholds: [] }],
    });
    mockUsePureToneTest.mockReturnValue(hook);
    const utils = render(<PureToneTestScreen />);
    passGate(utils);

    expect(utils.getByText('Résultat enregistré.')).toBeTruthy();
    expect(utils.getByText('Résultats: 2 oreille(s)')).toBeTruthy();

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
    mockUsePureToneTest.mockReturnValue(hook);
    const utils = render(<PureToneTestScreen />);
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
    mockUsePureToneTest.mockReturnValue(hook);
    const utils = render(<PureToneTestScreen />);
    passGate(utils);

    fireEvent.press(utils.UNSAFE_getByProps({ name: 'chevron-back' }).parent!);

    expect(alertSpy).toHaveBeenCalled();
    expect(hook.cancel).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  test('leaving from the intro stage exits immediately without a confirmation', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const utils = render(<PureToneTestScreen />);
    passGate(utils);

    fireEvent.press(utils.UNSAFE_getByProps({ name: 'chevron-back' }).parent!);

    expect(alertSpy).not.toHaveBeenCalled();
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  test('cancelling from the headphone gate exits without passing it', () => {
    const utils = render(<PureToneTestScreen />);
    fireEvent.press(utils.getByText('Annuler'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
