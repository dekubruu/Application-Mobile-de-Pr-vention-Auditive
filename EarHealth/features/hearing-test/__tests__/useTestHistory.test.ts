import { act, renderHook, waitFor } from '@testing-library/react-native';
import { fakeSession, mockAuthModule, mockUseAuth } from '../../../test-utils/mockAuth';

jest.mock('@/features/auth/hooks/useAuth', () => mockAuthModule);
jest.mock('../services/HearingResultService', () => ({
  getHearingTestHistory: jest.fn(),
}));

import { getHearingTestHistory } from '../services/HearingResultService';
import { useTestHistory } from '../hooks/useTestHistory';

const mockGetHistory = getHearingTestHistory as jest.Mock;

describe('useTestHistory', () => {
  beforeEach(() => {
    mockGetHistory.mockReset();
    mockUseAuth.mockReturnValue({ session: null, profile: null, loading: false, refreshProfile: jest.fn(), signOut: jest.fn() });
  });

  test('stays empty and not loading when there is no session', async () => {
    const { result } = renderHook(() => useTestHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries).toEqual([]);
    expect(mockGetHistory).not.toHaveBeenCalled();
  });

  test('loads and maps PTT rows into a view-ready HistoryEntry', async () => {
    mockUseAuth.mockReturnValue({ session: fakeSession('u1'), profile: null, loading: false, refreshProfile: jest.fn(), signOut: jest.fn() });
    mockGetHistory.mockResolvedValue([
      {
        id: '1', user_id: 'u1', created_at: '2026-01-01', test_type: 'ptt',
        overall_score: 85,
        payload: { ears: [{ ear: 'left', avgDb: 10, thresholds: [] }, { ear: 'right', avgDb: 20, thresholds: [] }] },
      },
    ]);

    const { result } = renderHook(() => useTestHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.entries).toEqual([
      { id: '1', createdAt: '2026-01-01', testType: 'ptt', score: 85, category: 'normal', ptaDb: 15 },
    ]);
  });

  test('maps HFRT rows with their frequency-specific fields', async () => {
    mockUseAuth.mockReturnValue({ session: fakeSession('u1'), profile: null, loading: false, refreshProfile: jest.fn(), signOut: jest.fn() });
    mockGetHistory.mockResolvedValue([
      {
        id: '2', user_id: 'u1', created_at: '2026-01-02', test_type: 'hfrt',
        overall_score: 45,
        payload: { maxFrequencyHz: 15_000, interpretation: 'Correcte', hitCeiling: false },
      },
    ]);

    const { result } = renderHook(() => useTestHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.entries[0]).toMatchObject({
      testType: 'hfrt',
      score: 45,
      category: 'moderate',
      maxFrequencyHz: 15_000,
      interpretation: 'Correcte',
    });
  });

  test('refresh() re-triggers the fetch', async () => {
    mockUseAuth.mockReturnValue({ session: fakeSession('u1'), profile: null, loading: false, refreshProfile: jest.fn(), signOut: jest.fn() });
    mockGetHistory.mockResolvedValue([]);

    const { result } = renderHook(() => useTestHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetHistory).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.refresh();
    });

    expect(mockGetHistory).toHaveBeenCalledTimes(2);
  });
});
