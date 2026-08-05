import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('../services/quiz.service', () => ({
  quizService: { fetchStats: jest.fn() },
}));
jest.mock('../services/quiz.storage', () => ({
  getCachedStats: jest.fn(),
  setCachedStats: jest.fn(),
}));

import { quizService } from '../services/quiz.service';
import { getCachedStats, setCachedStats } from '../services/quiz.storage';
import { useQuizStats } from '../hooks/useQuizStats';
import type { QuizStats } from '../types/quiz.types';

const mockFetchStats = quizService.fetchStats as jest.Mock;
const mockGetCachedStats = getCachedStats as jest.Mock;
const mockSetCachedStats = setCachedStats as jest.Mock;

const stats1: QuizStats = {
  sessionsPlayed: 1, totalAnswered: 10, totalCorrect: 8, totalPoints: 80,
  accuracyPct: 80, bestSessionPct: 80, bestSessionPoints: 80, lastSessionDate: '2026-01-01',
  totalQuestionsInApp: 60, correctDistinct: 5,
};
const stats2: QuizStats = { ...stats1, totalPoints: 999 };

describe('useQuizStats', () => {
  beforeEach(() => {
    mockFetchStats.mockReset();
    mockGetCachedStats.mockReset();
    mockSetCachedStats.mockReset();
    mockGetCachedStats.mockResolvedValue(null);
    mockSetCachedStats.mockResolvedValue(undefined);
  });

  test('with no userId: stats stay null, status becomes ready, no service call', async () => {
    const { result } = renderHook(() => useQuizStats(null));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.stats).toBeNull();
    expect(mockFetchStats).not.toHaveBeenCalled();
  });

  test('surfaces cached stats instantly, then replaces them with the fresh fetch', async () => {
    mockGetCachedStats.mockResolvedValue({ stats: stats1, cachedAt: 'now' });
    mockFetchStats.mockResolvedValue(stats2);

    const { result } = renderHook(() => useQuizStats('u1'));

    await waitFor(() => expect(result.current.stats).toEqual(stats2));
    expect(mockSetCachedStats).toHaveBeenCalledWith('u1', stats2);
  });

  test('with no cache: status is "loading" until the fetch resolves', async () => {
    let resolveFetch: (v: QuizStats) => void;
    mockFetchStats.mockReturnValue(new Promise(res => { resolveFetch = res; }));

    const { result } = renderHook(() => useQuizStats('u1'));
    expect(result.current.status).toBe('loading');

    await act(async () => {
      resolveFetch(stats1);
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.stats).toEqual(stats1);
  });

  test('on fetch failure with a cache available: stays on the cached data silently (no error)', async () => {
    mockGetCachedStats.mockResolvedValue({ stats: stats1, cachedAt: 'now' });
    mockFetchStats.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useQuizStats('u1'));

    await waitFor(() => expect(mockFetchStats).toHaveBeenCalled());
    expect(result.current.stats).toEqual(stats1);
    expect(result.current.status).toBe('ready');
    expect(result.current.error).toBeNull();
  });

  test('on fetch failure with no cache: surfaces an error state', async () => {
    mockFetchStats.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useQuizStats('u1'));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('network down');
  });

  test('changing userId clears the previous user’s stats synchronously (no cross-user leak)', async () => {
    mockFetchStats.mockImplementation((id: string) => Promise.resolve(id === 'u1' ? stats1 : stats2));

    const { result, rerender } = renderHook(({ userId }) => useQuizStats(userId), { initialProps: { userId: 'u1' } });
    await waitFor(() => expect(result.current.stats).toEqual(stats1));

    rerender({ userId: 'u2' });
    // Cleared synchronously in the same effect pass that starts the new fetch.
    expect(result.current.stats).toBeNull();

    await waitFor(() => expect(result.current.stats).toEqual(stats2));
  });

  test('refresh() re-invokes the service', async () => {
    mockFetchStats.mockResolvedValue(stats1);
    const { result } = renderHook(() => useQuizStats('u1'));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => { await result.current.refresh(); });

    expect(mockFetchStats).toHaveBeenCalledTimes(2);
  });
});
