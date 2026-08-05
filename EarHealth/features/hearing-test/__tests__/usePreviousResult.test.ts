import { renderHook, waitFor } from '@testing-library/react-native';
import { fakeSession, mockAuthModule, mockUseAuth } from '../../../test-utils/mockAuth';

jest.mock('@/features/auth/hooks/useAuth', () => mockAuthModule);
jest.mock('../services/HearingResultService', () => ({
  getPreviousPTTResult: jest.fn(),
  getPreviousHFRTResult: jest.fn(),
  // Real pttPayloadToEarResults is a pure 1:1 map, already covered directly
  // in HearingResultService.test.ts — a lightweight equivalent here avoids
  // requireActual (which would pull in the real Supabase client module).
  pttPayloadToEarResults: jest.fn((payload) => payload.ears.map((e: any) => ({ ear: e.ear, avgDb: e.avgDb, thresholds: [] }))),
}));

import { getPreviousHFRTResult, getPreviousPTTResult } from '../services/HearingResultService';
import { usePreviousPTTResult } from '../hooks/usePreviousPTTResult';
import { usePreviousHFRTResult } from '../hooks/usePreviousHFRTResult';

const mockGetPreviousPTT = getPreviousPTTResult as jest.Mock;
const mockGetPreviousHFRT = getPreviousHFRTResult as jest.Mock;

describe('usePreviousPTTResult', () => {
  beforeEach(() => {
    mockGetPreviousPTT.mockReset();
    mockUseAuth.mockReturnValue({ session: fakeSession('u1'), profile: null, loading: false, refreshProfile: jest.fn(), signOut: jest.fn() });
  });

  test('returns null and does not fetch when beforeIso is null', () => {
    const { result } = renderHook(() => usePreviousPTTResult(null));
    expect(result.current).toBeNull();
    expect(mockGetPreviousPTT).not.toHaveBeenCalled();
  });

  test('returns null without fetching when there is no session', () => {
    mockUseAuth.mockReturnValue({ session: null, profile: null, loading: false, refreshProfile: jest.fn(), signOut: jest.fn() });
    renderHook(() => usePreviousPTTResult('2026-01-01'));
    expect(mockGetPreviousPTT).not.toHaveBeenCalled();
  });

  test('returns null when no previous result exists', async () => {
    mockGetPreviousPTT.mockResolvedValue(null);
    const { result } = renderHook(() => usePreviousPTTResult('2026-01-01'));
    await waitFor(() => expect(mockGetPreviousPTT).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  test('maps the previous row payload into ear results', async () => {
    mockGetPreviousPTT.mockResolvedValue({
      id: 'p1', payload: { ears: [{ ear: 'left', avgDb: 15, thresholds: [{ freq: 500, db: 15 }] }] },
    });
    const { result } = renderHook(() => usePreviousPTTResult('2026-01-01'));
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current?.[0].ear).toBe('left');
    expect(result.current?.[0].avgDb).toBe(15);
  });
});

describe('usePreviousHFRTResult', () => {
  beforeEach(() => {
    mockGetPreviousHFRT.mockReset();
    mockUseAuth.mockReturnValue({ session: fakeSession('u1'), profile: null, loading: false, refreshProfile: jest.fn(), signOut: jest.fn() });
  });

  test('returns null and does not fetch when beforeIso is null', () => {
    const { result } = renderHook(() => usePreviousHFRTResult(null));
    expect(result.current).toBeNull();
    expect(mockGetPreviousHFRT).not.toHaveBeenCalled();
  });

  test('resolves to the previous max audible frequency', async () => {
    mockGetPreviousHFRT.mockResolvedValue({ id: 'p2', payload: { maxFrequencyHz: 16_000, interpretation: 'Bonne' } });
    const { result } = renderHook(() => usePreviousHFRTResult('2026-01-01'));
    await waitFor(() => expect(result.current).toBe(16_000));
  });

  test('returns null when no previous result exists', async () => {
    mockGetPreviousHFRT.mockResolvedValue(null);
    const { result } = renderHook(() => usePreviousHFRTResult('2026-01-01'));
    await waitFor(() => expect(mockGetPreviousHFRT).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });
});
