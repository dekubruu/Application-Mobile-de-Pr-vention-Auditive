import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { makeQueryResult, mockAuth, mockFrom, mockSupabase, resetSupabaseMock } from '../../../test-utils/supabaseMock';

jest.mock('@/src/utils/supabase', () => ({ supabase: mockSupabase }));
jest.mock('@/features/quiz/services/quiz.service', () => ({
  quizService: { flushPendingSessions: jest.fn().mockResolvedValue({ flushed: 0, remaining: 0, skipped: false }) },
}));
jest.mock('@/features/hearing-test/services/HearingResultService', () => ({
  flushPendingHearingResults: jest.fn().mockResolvedValue({ flushed: 0, remaining: 0, skipped: false }),
}));

import { quizService } from '@/features/quiz/services/quiz.service';
import { flushPendingHearingResults } from '@/features/hearing-test/services/HearingResultService';
import { AuthProvider, useAuthContext } from '../context/AuthContext';

const mockFlushQuiz = quizService.flushPendingSessions as jest.Mock;
const mockFlushHearing = flushPendingHearingResults as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

const fakeUser = { id: 'u1', email: 'a@b.com' };
const fakeSession = { user: fakeUser, access_token: 'tok' };
const fakeProfile = {
  id: 'u1', username: 'Alice', date_of_birth: null, gender: null,
  total_points: 100, owned_tiers: [], active_theme: 'default',
  created_at: 'now', updated_at: 'now',
};

describe('AuthProvider / useAuthContext', () => {
  beforeEach(() => {
    resetSupabaseMock();
    mockFlushQuiz.mockClear();
    mockFlushHearing.mockClear();
  });

  test('starts with loading=true, session=null, profile=null', async () => {
    let resolveSession: (v: { data: { session: null } }) => void;
    mockAuth.getSession.mockReturnValue(new Promise(res => { resolveSession = res; }));

    const { result } = renderHook(() => useAuthContext(), { wrapper });
    expect(result.current.loading).toBe(true);
    expect(result.current.session).toBeNull();
    expect(result.current.profile).toBeNull();

    // Resolve before the test ends so the pending effect doesn't leak a
    // state update into a later test (unmounted-update / act() warnings).
    await act(async () => {
      resolveSession({ data: { session: null } });
    });
  });

  test('with no existing session: loading becomes false, session/profile stay null', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null } });
    const { result } = renderHook(() => useAuthContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();
  });

  test('with an existing session: fetches the profile and clears loading', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: fakeSession } });
    mockFrom.mockReturnValue(makeQueryResult({ data: fakeProfile, error: null }));

    const { result } = renderHook(() => useAuthContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.session).toEqual(fakeSession);
    expect(result.current.profile).toEqual(fakeProfile);
  });

  test('a failed profile fetch leaves profile null but still clears loading', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: fakeSession } });
    mockFrom.mockReturnValue(makeQueryResult({ data: null, error: { message: 'not found' } }));

    const { result } = renderHook(() => useAuthContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.profile).toBeNull();
  });

  test('fires a cold-start flush of both queues once a session is present', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: fakeSession } });
    mockFrom.mockReturnValue(makeQueryResult({ data: fakeProfile, error: null }));

    renderHook(() => useAuthContext(), { wrapper });

    await waitFor(() => expect(mockFlushQuiz).toHaveBeenCalledWith('u1'));
    expect(mockFlushHearing).toHaveBeenCalledWith('u1');
  });

  test('does not attempt a flush with no session', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null } });
    const { result } = renderHook(() => useAuthContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFlushQuiz).not.toHaveBeenCalled();
  });

  test('signOut() calls supabase.auth.signOut()', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null } });
    mockAuth.signOut.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuthContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.signOut();
    expect(mockAuth.signOut).toHaveBeenCalled();
  });

  test('refreshProfile() re-fetches the profile for the current session', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: fakeSession } });
    mockFrom.mockReturnValue(makeQueryResult({ data: fakeProfile, error: null }));

    const { result } = renderHook(() => useAuthContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const updated = { ...fakeProfile, username: 'Bob' };
    mockFrom.mockReturnValue(makeQueryResult({ data: updated, error: null }));

    await result.current.refreshProfile();

    await waitFor(() => expect(result.current.profile).toEqual(updated));
  });

  test('onAuthStateChange updates session and fetches the new profile', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null } });
    let authCallback: ((event: string, session: unknown) => void) | undefined;
    mockAuth.onAuthStateChange.mockImplementation((cb: any) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });
    mockFrom.mockReturnValue(makeQueryResult({ data: fakeProfile, error: null }));

    const { result } = renderHook(() => useAuthContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();

    // NOTE: the AuthContext callback fires a fire-and-forget fetchProfile()
    // internally (not awaited by the callback itself), so React logs a
    // benign "not wrapped in act()" warning for its later setProfile() call
    // no matter how this is structured — nesting waitFor inside act() here
    // breaks the update entirely rather than silencing the warning. The
    // assertions below still correctly prove the observable behavior.
    act(() => {
      authCallback?.('SIGNED_IN', fakeSession);
    });

    await waitFor(() => expect(result.current.session).toEqual(fakeSession));
    await waitFor(() => expect(result.current.profile).toEqual(fakeProfile));
  });
});

describe('useAuthContext outside an AuthProvider', () => {
  test('throws a clear error', () => {
    const { result } = renderHook(() => {
      try {
        return useAuthContext();
      } catch (e) {
        return e;
      }
    });
    expect(result.current).toBeInstanceOf(Error);
  });
});
