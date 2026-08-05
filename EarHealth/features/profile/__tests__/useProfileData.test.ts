import { renderHook, waitFor } from '@testing-library/react-native';
import { fakeSession, mockAuthModule, mockUseAuth } from '../../../test-utils/mockAuth';
import { makeQueryResult, mockFrom, mockSupabase, resetSupabaseMock } from '../../../test-utils/supabaseMock';

jest.mock('@/src/utils/supabase', () => ({ supabase: mockSupabase }));
jest.mock('@/features/auth/hooks/useAuth', () => mockAuthModule);
jest.mock('@/features/quiz/hooks/useQuizStats', () => ({ useQuizStats: jest.fn() }));

import { useQuizStats } from '@/features/quiz/hooks/useQuizStats';
import { useProfileData } from '../hooks/useProfileData';

const mockUseQuizStats = useQuizStats as jest.Mock;

describe('useProfileData', () => {
  beforeEach(() => {
    resetSupabaseMock();
    mockUseQuizStats.mockReturnValue({ stats: null, status: 'ready', error: null, refresh: jest.fn() });
  });

  test('with no session: testsCount stays 0 and loadingStats clears without querying', async () => {
    mockUseAuth.mockReturnValue({ session: null, profile: null, loading: false, refreshProfile: jest.fn(), signOut: jest.fn() });

    const { result } = renderHook(() => useProfileData());
    await waitFor(() => expect(result.current.loadingStats).toBe(false));

    expect(result.current.testsCount).toBe(0);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('with a session: fetches the hearing-test count and exposes it', async () => {
    mockUseAuth.mockReturnValue({ session: fakeSession('u1'), profile: null, loading: false, refreshProfile: jest.fn(), signOut: jest.fn() });
    mockFrom.mockReturnValue(makeQueryResult({ data: null, error: null, count: 7 }));

    const { result } = renderHook(() => useProfileData());
    await waitFor(() => expect(result.current.loadingStats).toBe(false));

    expect(result.current.testsCount).toBe(7);
    expect(mockFrom).toHaveBeenCalledWith('hearing_test_results');
  });

  test('surfaces quizSessionsPlayed from useQuizStats, defaulting to 0 when stats are null', async () => {
    mockUseAuth.mockReturnValue({ session: fakeSession('u1'), profile: null, loading: false, refreshProfile: jest.fn(), signOut: jest.fn() });
    mockFrom.mockReturnValue(makeQueryResult({ data: null, error: null, count: 0 }));

    const { result } = renderHook(() => useProfileData());
    expect(result.current.quizSessionsPlayed).toBe(0);
    await waitFor(() => expect(result.current.loadingStats).toBe(false));
  });

  test('reads quizSessionsPlayed from the real quiz stats when present', async () => {
    mockUseAuth.mockReturnValue({ session: fakeSession('u1'), profile: null, loading: false, refreshProfile: jest.fn(), signOut: jest.fn() });
    mockFrom.mockReturnValue(makeQueryResult({ data: null, error: null, count: 0 }));
    mockUseQuizStats.mockReturnValue({
      stats: { sessionsPlayed: 4, totalAnswered: 0, totalCorrect: 0, totalPoints: 0, accuracyPct: 0, bestSessionPct: 0, bestSessionPoints: 0, lastSessionDate: null, totalQuestionsInApp: 0, correctDistinct: 0 },
      status: 'ready', error: null, refresh: jest.fn(),
    });

    const { result } = renderHook(() => useProfileData());
    expect(result.current.quizSessionsPlayed).toBe(4);
    await waitFor(() => expect(result.current.loadingStats).toBe(false));
  });
});
