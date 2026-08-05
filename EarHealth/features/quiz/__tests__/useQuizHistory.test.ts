import { act, renderHook, waitFor } from '@testing-library/react-native';
import { fakeSession, mockAuthModule, mockUseAuth } from '../../../test-utils/mockAuth';

jest.mock('@/features/auth/hooks/useAuth', () => mockAuthModule);
jest.mock('../services/quiz.service', () => ({
  quizService: { getHistory: jest.fn() },
}));

import { quizService } from '../services/quiz.service';
import { useQuizHistory } from '../hooks/useQuizHistory';

const mockGetHistory = quizService.getHistory as jest.Mock;

describe('useQuizHistory', () => {
  beforeEach(() => {
    mockGetHistory.mockReset();
    mockUseAuth.mockReturnValue({ session: null, profile: null, loading: false, refreshProfile: jest.fn(), signOut: jest.fn() });
  });

  test('stays empty and not loading with no session, without calling the service', async () => {
    const { result } = renderHook(() => useQuizHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries).toEqual([]);
    expect(mockGetHistory).not.toHaveBeenCalled();
  });

  test('loads entries for a logged-in user, capped at the 10-item limit', async () => {
    mockUseAuth.mockReturnValue({ session: fakeSession('u1'), profile: null, loading: false, refreshProfile: jest.fn(), signOut: jest.fn() });
    const rows = [{ id: 's1' }];
    mockGetHistory.mockResolvedValue(rows);

    const { result } = renderHook(() => useQuizHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.entries).toEqual(rows);
    expect(mockGetHistory).toHaveBeenCalledWith('u1', 10);
  });

  test('refresh() re-fetches', async () => {
    mockUseAuth.mockReturnValue({ session: fakeSession('u1'), profile: null, loading: false, refreshProfile: jest.fn(), signOut: jest.fn() });
    mockGetHistory.mockResolvedValue([]);

    const { result } = renderHook(() => useQuizHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { result.current.refresh(); });

    expect(mockGetHistory).toHaveBeenCalledTimes(2);
  });
});
