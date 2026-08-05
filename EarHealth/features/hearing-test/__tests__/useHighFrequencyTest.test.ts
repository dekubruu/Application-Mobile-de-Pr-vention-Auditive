import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useHighFrequencyTest } from '../hooks/useHighFrequencyTest';
import { HFRT_MAX_FREQ, HFRT_START_FREQ, HFRT_STEP_MS } from '../services/HFRTAlgorithm';

jest.mock('../services/HearingResultService', () => ({
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

// Alternates hold/release on every tick. The first tick can never register a
// reversal (lastTransition starts null), so alternating from the first tick
// produces a reversal on almost every subsequent one — converging on
// HFRT_REVERSALS_TARGET (8) well within a generous tick budget.
function driveAlternating(result: { current: ReturnType<typeof useHighFrequencyTest> }, ticks: number) {
  for (let j = 0; j < ticks; j++) {
    act(() => {
      if (j % 2 === 0) result.current.onHoldStart(); else result.current.onHoldEnd();
      jest.advanceTimersByTime(HFRT_STEP_MS);
    });
  }
}

function driveHeld(result: { current: ReturnType<typeof useHighFrequencyTest> }, held: boolean, ticks: number) {
  act(() => {
    if (held) result.current.onHoldStart(); else result.current.onHoldEnd();
  });
  for (let j = 0; j < ticks; j++) {
    act(() => { jest.advanceTimersByTime(HFRT_STEP_MS); });
  }
}

describe('useHighFrequencyTest', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockSave.mockReset();
    mockSave.mockResolvedValue({ status: 'synced' });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('starts in the intro stage with defaults', () => {
    const audio = makeAudioHandle();
    const { result } = renderHook(() => useHighFrequencyTest({ audio, audioReady: true, userId: 'u1' }));

    expect(result.current.stage).toBe('intro');
    expect(result.current.currentFreq).toBe(HFRT_START_FREQ);
    expect(result.current.reversalCount).toBe(0);
    expect(result.current.result).toBeNull();
    expect(result.current.saveStatus).toBe('idle');
  });

  test('start() enters the testing stage and plays the initial tone', () => {
    const audio = makeAudioHandle();
    const { result } = renderHook(() => useHighFrequencyTest({ audio, audioReady: true, userId: 'u1' }));

    act(() => { result.current.start(); });

    expect(result.current.stage).toBe('testing');
    expect(audio.current.playTone).toHaveBeenCalledWith(HFRT_START_FREQ, expect.any(Number), 'both');
  });

  test('onHoldStart/onHoldEnd toggle the isHeld flag', () => {
    const audio = makeAudioHandle();
    const { result } = renderHook(() => useHighFrequencyTest({ audio, audioReady: true, userId: 'u1' }));

    act(() => { result.current.onHoldStart(); });
    expect(result.current.isHeld).toBe(true);

    act(() => { result.current.onHoldEnd(); });
    expect(result.current.isHeld).toBe(false);
  });

  test('cancel() resets back to intro and stops the tone', () => {
    const audio = makeAudioHandle();
    const { result } = renderHook(() => useHighFrequencyTest({ audio, audioReady: true, userId: 'u1' }));

    act(() => { result.current.start(); });
    driveAlternating(result, 3);
    act(() => { result.current.cancel(); });

    expect(result.current.stage).toBe('intro');
    expect(result.current.currentFreq).toBe(HFRT_START_FREQ);
    expect(result.current.reversalCount).toBe(0);
    expect(result.current.result).toBeNull();
    expect(audio.current.stopTone).toHaveBeenCalled();
  });

  test('the tone frequency tracks the staircase while testing', () => {
    const audio = makeAudioHandle();
    const { result } = renderHook(() => useHighFrequencyTest({ audio, audioReady: true, userId: 'u1' }));

    act(() => { result.current.start(); });
    driveAlternating(result, 3);

    expect(audio.current.setFrequency).toHaveBeenCalled();
  });

  test('converges after enough reversals and produces a reliable result', () => {
    const audio = makeAudioHandle();
    const { result } = renderHook(() => useHighFrequencyTest({ audio, audioReady: true, userId: 'u1' }));

    act(() => { result.current.start(); });
    driveAlternating(result, 20);

    expect(result.current.stage).toBe('result');
    expect(result.current.result).not.toBeNull();
    expect(result.current.result?.reliable).toBe(true);
    expect(result.current.result?.noResponse).toBe(false);
    expect(result.current.result?.hitCeiling).toBe(false);
    expect(audio.current.stopTone).toHaveBeenCalled();
  });

  test('finishes with a "no response" result when the user never holds', () => {
    const audio = makeAudioHandle();
    const { result } = renderHook(() => useHighFrequencyTest({ audio, audioReady: true, userId: 'u1' }));

    act(() => { result.current.start(); });
    driveHeld(result, false, 110);

    expect(result.current.stage).toBe('result');
    expect(result.current.result?.noResponse).toBe(true);
    expect(result.current.result?.maxAudibleFrequency).toBe(HFRT_START_FREQ);
  });

  test('finishes with a ceiling result when held continuously up to 20 kHz', () => {
    const audio = makeAudioHandle();
    const { result } = renderHook(() => useHighFrequencyTest({ audio, audioReady: true, userId: 'u1' }));

    act(() => { result.current.start(); });
    driveHeld(result, true, 60);

    expect(result.current.stage).toBe('result');
    expect(result.current.result?.hitCeiling).toBe(true);
    expect(result.current.result?.maxAudibleFrequency).toBe(HFRT_MAX_FREQ);
  });

  test('saves the result and reports "saved" once synced', async () => {
    const audio = makeAudioHandle();
    const { result } = renderHook(() => useHighFrequencyTest({ audio, audioReady: true, userId: 'u1' }));

    act(() => { result.current.start(); });
    driveAlternating(result, 20);

    expect(result.current.saveStatus).toBe('saving');

    jest.useRealTimers();
    await waitFor(() => expect(result.current.saveStatus).toBe('saved'));
    expect(mockSave).toHaveBeenCalledWith(
      'u1', 'hfrt', expect.objectContaining({ maxFrequencyHz: expect.any(Number) }), expect.any(Number),
    );
  });

  test('reports "queued" when the save is only enqueued offline', async () => {
    mockSave.mockResolvedValue({ status: 'queued' });
    const audio = makeAudioHandle();
    const { result } = renderHook(() => useHighFrequencyTest({ audio, audioReady: true, userId: 'u1' }));

    act(() => { result.current.start(); });
    driveAlternating(result, 20);

    jest.useRealTimers();
    await waitFor(() => expect(result.current.saveStatus).toBe('queued'));
  });

  test('reports "error" when the resilient save rejects', async () => {
    mockSave.mockRejectedValue(new Error('AsyncStorage full'));
    const audio = makeAudioHandle();
    const { result } = renderHook(() => useHighFrequencyTest({ audio, audioReady: true, userId: 'u1' }));

    act(() => { result.current.start(); });
    driveAlternating(result, 20);

    jest.useRealTimers();
    await waitFor(() => expect(result.current.saveStatus).toBe('error'));
  });

  test('does not save a "no response" result', async () => {
    const audio = makeAudioHandle();
    const { result } = renderHook(() => useHighFrequencyTest({ audio, audioReady: true, userId: 'u1' }));

    act(() => { result.current.start(); });
    driveHeld(result, false, 110);

    expect(result.current.stage).toBe('result');
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mockSave).not.toHaveBeenCalled();
    expect(result.current.saveStatus).toBe('idle');
  });

  test('does not attempt to save when no userId is provided', async () => {
    const audio = makeAudioHandle();
    const { result } = renderHook(() => useHighFrequencyTest({ audio, audioReady: true, userId: null }));

    act(() => { result.current.start(); });
    driveAlternating(result, 20);

    expect(result.current.stage).toBe('result');
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mockSave).not.toHaveBeenCalled();
    expect(result.current.saveStatus).toBe('idle');
  });
});
