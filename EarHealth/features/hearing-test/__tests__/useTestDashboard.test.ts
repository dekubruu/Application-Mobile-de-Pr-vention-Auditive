import { renderHook, waitFor } from '@testing-library/react-native';
import { fakeSession, mockAuthModule, mockUseAuth } from '../../../test-utils/mockAuth';

jest.mock('@/features/auth/hooks/useAuth', () => mockAuthModule);
jest.mock('../services/HearingResultService', () => ({
  getHearingTestHistory: jest.fn(),
}));

import { getHearingTestHistory } from '../services/HearingResultService';
import { useTestDashboard } from '../hooks/useTestDashboard';

const mockGetHistory = getHearingTestHistory as jest.Mock;

function pttRow(id: string, createdAt: string, score: number) {
  return { id, user_id: 'u1', created_at: createdAt, test_type: 'ptt' as const, overall_score: score, payload: { ears: [] } };
}

describe('useTestDashboard', () => {
  beforeEach(() => {
    mockGetHistory.mockReset();
    mockUseAuth.mockReturnValue({ session: fakeSession('u1'), profile: null, loading: false, refreshProfile: jest.fn(), signOut: jest.fn() });
  });

  test('reports "none" trend and null scores with no history', async () => {
    mockGetHistory.mockResolvedValue([]);
    const { result } = renderHook(() => useTestDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.testCount).toBe(0);
    expect(result.current.lastScore).toBeNull();
    expect(result.current.avgScore).toBeNull();
    expect(result.current.trend).toBe('none');
    expect(result.current.lastTestDate).toBeNull();
  });

  test('reports "none" trend with only a single test (not enough to compare)', async () => {
    mockGetHistory.mockResolvedValue([pttRow('1', '2026-01-01', 80)]);
    const { result } = renderHook(() => useTestDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.lastScore).toBe(80);
    expect(result.current.avgScore).toBe(80);
    expect(result.current.trend).toBe('none');
  });

  test('reports "up" when the latest score is more than 3 points above the previous one', async () => {
    // getHearingTestHistory returns newest-first.
    mockGetHistory.mockResolvedValue([pttRow('2', '2026-01-02', 90), pttRow('1', '2026-01-01', 80)]);
    const { result } = renderHook(() => useTestDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.trend).toBe('up');
    expect(result.current.avgScore).toBe(85);
  });

  test('reports "down" when the latest score drops by more than 3 points', async () => {
    mockGetHistory.mockResolvedValue([pttRow('2', '2026-01-02', 60), pttRow('1', '2026-01-01', 80)]);
    const { result } = renderHook(() => useTestDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.trend).toBe('down');
  });

  test('reports "stable" when the change is within ±3 points', async () => {
    mockGetHistory.mockResolvedValue([pttRow('2', '2026-01-02', 81), pttRow('1', '2026-01-01', 80)]);
    const { result } = renderHook(() => useTestDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.trend).toBe('stable');
  });

  test('does not fetch and stops loading when there is no session', async () => {
    mockUseAuth.mockReturnValue({ session: null, profile: null, loading: false, refreshProfile: jest.fn(), signOut: jest.fn() });
    const { result } = renderHook(() => useTestDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetHistory).not.toHaveBeenCalled();
  });
});
