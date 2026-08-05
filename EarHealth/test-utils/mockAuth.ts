// Shared mock for `useAuth()` (from '@/features/auth/hooks/useAuth'), used by
// any hook/component/screen test that needs a session/profile without
// mounting the real AuthProvider (which talks to Supabase on mount).
//
// Usage in a test file:
//   jest.mock('@/features/auth/hooks/useAuth', () => require('../../../test-utils/mockAuth').mockAuthModule);
//   ...
//   mockUseAuth.mockReturnValue({ session: fakeSession('u1'), profile: null, loading: false, refreshProfile: jest.fn(), signOut: jest.fn() });

export function fakeSession(userId: string, email = 'user@example.com') {
  return {
    user: { id: userId, email },
    access_token: 'test-token',
  } as any;
}

export const mockUseAuth = jest.fn(() => ({
  session: null as ReturnType<typeof fakeSession> | null,
  profile: null,
  loading: false,
  refreshProfile: jest.fn(),
  signOut: jest.fn(),
}));

export const mockAuthModule = {
  useAuth: mockUseAuth,
};
