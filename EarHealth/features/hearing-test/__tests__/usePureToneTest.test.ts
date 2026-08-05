import { act, renderHook, waitFor } from '@testing-library/react-native';
import { usePureToneTest } from '../hooks/usePureToneTest';
import { PTT_FREQUENCIES, PTT_PULSE_CYCLE_MS } from '../services/PTTAlgorithm';

jest.mock('../services/HearingResultService', () => ({
  calculateHearingScore: jest.fn(() => 75),
  saveHearingResultResilient: jest.fn(),
}));

import { saveHearingResultResilient } from '../services/HearingResultService';

const mockSave = saveHearingResultResilient as jest.Mock;

function makeAudioHandle() {
  return {
    current: {
      playTone: jest.fn(),
      stopTone: jest.fn(),
      setVolume: jest.fn(),
      setFrequency: jest.fn(),
    },
  };
}

// Alternates hold/release on every tick. The very first tick per frequency
// (fired synchronously on entering `testing`/advancing) is forced to
// "release" by the algorithm's guard window regardless of the held ref, so
// starting the pattern on "hold" reliably produces a reversal almost every
// subsequent tick — converging (6 reversals) well within a generous budget.
function drivePulses(result: { current: ReturnType<typeof usePureToneTest> }, ticks: number) {
  for (let j = 0; j < ticks; j++) {
    act(() => {
      if (j % 2 === 0) result.current.onHoldStart();
      else result.current.onHoldEnd();
      jest.advanceTimersByTime(PTT_PULSE_CYCLE_MS);
    });
  }
}

describe('usePureToneTest', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockSave.mockReset();
    mockSave.mockResolvedValue({ status: 'synced' });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('starts in the intro stage with empty results', () => {
    const audio = makeAudioHandle();
    const { result } = renderHook(() => usePureToneTest({ audio, audioReady: true, userId: 'u1' }));

    expect(result.current.stage).toBe('intro');
    expect(result.current.currentEar).toBe('left');
    expect(result.current.totalFreqs).toBe(PTT_FREQUENCIES.length);
    expect(result.current.completedFreqs).toEqual([]);
    expect(result.current.earResults).toEqual([]);
    expect(result.current.saveStatus).toBe('idle');
  });

  test('start() enters the testing stage and plays the first tone', () => {
    const audio = makeAudioHandle();
    const { result } = renderHook(() => usePureToneTest({ audio, audioReady: true, userId: 'u1' }));

    act(() => { result.current.start(); });

    expect(result.current.stage).toBe('testing');
    expect(result.current.freqIndex).toBe(0);
    expect(audio.current.playTone).toHaveBeenCalled();
  });

  test('does not start playing a tone while the audio bridge is not ready', () => {
    const audio = makeAudioHandle();
    const { result } = renderHook(() => usePureToneTest({ audio, audioReady: false, userId: 'u1' }));

    act(() => { result.current.start(); });

    expect(result.current.stage).toBe('testing');
    expect(audio.current.playTone).not.toHaveBeenCalled();
  });

  test('onHoldStart/onHoldEnd toggle the isHeld flag', () => {
    const audio = makeAudioHandle();
    const { result } = renderHook(() => usePureToneTest({ audio, audioReady: true, userId: 'u1' }));

    act(() => { result.current.onHoldStart(); });
    expect(result.current.isHeld).toBe(true);

    act(() => { result.current.onHoldEnd(); });
    expect(result.current.isHeld).toBe(false);
  });

  test('cancel() resets the test back to intro and stops the tone', () => {
    const audio = makeAudioHandle();
    const { result } = renderHook(() => usePureToneTest({ audio, audioReady: true, userId: 'u1' }));

    act(() => { result.current.start(); });
    act(() => { result.current.onHoldStart(); });
    act(() => { result.current.cancel(); });

    expect(result.current.stage).toBe('intro');
    expect(result.current.isHeld).toBe(false);
    expect(result.current.freqIndex).toBe(0);
    expect(result.current.completedFreqs).toEqual([]);
    expect(result.current.earResults).toEqual([]);
    expect(audio.current.stopTone).toHaveBeenCalled();
  });

  test('converging on one frequency advances to the next with a completed result recorded', () => {
    const audio = makeAudioHandle();
    const { result } = renderHook(() => usePureToneTest({ audio, audioReady: true, userId: 'u1' }));

    act(() => { result.current.start(); });
    // Stop as soon as the first frequency converges, so exactly one result
    // has landed (drivePulses' fixed tick count would run into the next one).
    for (let j = 0; j < 16 && result.current.freqIndex === 0; j++) {
      act(() => {
        if (j % 2 === 0) result.current.onHoldStart(); else result.current.onHoldEnd();
        jest.advanceTimersByTime(PTT_PULSE_CYCLE_MS);
      });
    }

    expect(result.current.freqIndex).toBeGreaterThan(0);
    expect(result.current.completedFreqs).toHaveLength(1);
    expect(result.current.completedFreqs[0].frequency).toBe(PTT_FREQUENCIES[0]);
  });

  test('finishing all frequencies for the left ear moves to between-ears without saving', () => {
    const audio = makeAudioHandle();
    const { result } = renderHook(() => usePureToneTest({ audio, audioReady: true, userId: 'u1' }));

    act(() => { result.current.start(); });
    drivePulses(result, 16 * PTT_FREQUENCIES.length);

    expect(result.current.stage).toBe('between-ears');
    expect(result.current.earResults).toHaveLength(1);
    expect(result.current.earResults[0].ear).toBe('left');
    expect(mockSave).not.toHaveBeenCalled();
  });

  test('finishing both ears saves the result and reports "saved" once synced', async () => {
    const audio = makeAudioHandle();
    const { result } = renderHook(() => usePureToneTest({ audio, audioReady: true, userId: 'u1' }));

    act(() => { result.current.start(); });
    drivePulses(result, 16 * PTT_FREQUENCIES.length);
    act(() => { result.current.startRightEar(); });
    drivePulses(result, 16 * PTT_FREQUENCIES.length);

    expect(result.current.stage).toBe('result');
    expect(result.current.earResults).toHaveLength(2);
    expect(result.current.saveStatus).toBe('saving');

    jest.useRealTimers();
    await waitFor(() => expect(result.current.saveStatus).toBe('saved'));
    expect(mockSave).toHaveBeenCalledWith(
      'u1', 'ptt', expect.objectContaining({ ears: expect.any(Array) }), 75,
    );
  });

  test('reports "queued" when the save is only enqueued offline', async () => {
    mockSave.mockResolvedValue({ status: 'queued' });
    const audio = makeAudioHandle();
    const { result } = renderHook(() => usePureToneTest({ audio, audioReady: true, userId: 'u1' }));

    act(() => { result.current.start(); });
    drivePulses(result, 16 * PTT_FREQUENCIES.length);
    act(() => { result.current.startRightEar(); });
    drivePulses(result, 16 * PTT_FREQUENCIES.length);

    jest.useRealTimers();
    await waitFor(() => expect(result.current.saveStatus).toBe('queued'));
  });

  test('reports "error" when the resilient save rejects', async () => {
    mockSave.mockRejectedValue(new Error('AsyncStorage full'));
    const audio = makeAudioHandle();
    const { result } = renderHook(() => usePureToneTest({ audio, audioReady: true, userId: 'u1' }));

    act(() => { result.current.start(); });
    drivePulses(result, 16 * PTT_FREQUENCIES.length);
    act(() => { result.current.startRightEar(); });
    drivePulses(result, 16 * PTT_FREQUENCIES.length);

    jest.useRealTimers();
    await waitFor(() => expect(result.current.saveStatus).toBe('error'));
  });

  test('does not attempt to save when no userId is provided', async () => {
    const audio = makeAudioHandle();
    const { result } = renderHook(() => usePureToneTest({ audio, audioReady: true, userId: null }));

    act(() => { result.current.start(); });
    drivePulses(result, 16 * PTT_FREQUENCIES.length);
    act(() => { result.current.startRightEar(); });
    drivePulses(result, 16 * PTT_FREQUENCIES.length);

    expect(result.current.stage).toBe('result');
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mockSave).not.toHaveBeenCalled();
    expect(result.current.saveStatus).toBe('idle');
  });
});
