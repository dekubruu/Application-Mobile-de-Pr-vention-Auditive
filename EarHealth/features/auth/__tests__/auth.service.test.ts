import { mockAuth, mockSupabase, resetSupabaseMock } from '../../../test-utils/supabaseMock';

jest.mock('@/src/utils/supabase', () => ({ supabase: mockSupabase }));

import { authService } from '../services/auth.service';

describe('authService.signIn', () => {
  beforeEach(() => resetSupabaseMock());

  test('resolves with the session data on success', async () => {
    const session = { user: { id: 'u1' } };
    mockAuth.signInWithPassword.mockResolvedValue({ data: session, error: null });

    const result = await authService.signIn('a@b.com', 'secret');

    expect(result).toBe(session);
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret' });
  });

  test('throws the Supabase error on invalid credentials', async () => {
    const error = { message: 'Invalid login credentials' };
    mockAuth.signInWithPassword.mockResolvedValue({ data: null, error });

    await expect(authService.signIn('a@b.com', 'wrong')).rejects.toBe(error);
  });
});

describe('authService.signUp', () => {
  beforeEach(() => resetSupabaseMock());

  test('passes username/date_of_birth/gender as auth metadata', async () => {
    mockAuth.signUp.mockResolvedValue({ data: { user: { id: 'u2' } }, error: null });

    await authService.signUp('a@b.com', 'secret', 'Alice', '2000-01-01', 'female');

    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'secret',
      options: { data: { username: 'Alice', date_of_birth: '2000-01-01', gender: 'female' } },
    });
  });

  test('throws on signup error (e.g. duplicate email)', async () => {
    const error = { message: 'User already registered' };
    mockAuth.signUp.mockResolvedValue({ data: null, error });

    await expect(authService.signUp('dup@b.com', 'x', 'Bob', '1990-01-01', 'male')).rejects.toBe(error);
  });
});

describe('authService.signOut', () => {
  beforeEach(() => resetSupabaseMock());

  test('resolves without throwing on success', async () => {
    mockAuth.signOut.mockResolvedValue({ error: null });
    await expect(authService.signOut()).resolves.toBeUndefined();
  });

  test('throws the Supabase error when sign-out fails', async () => {
    const error = { message: 'Network error' };
    mockAuth.signOut.mockResolvedValue({ error });
    await expect(authService.signOut()).rejects.toBe(error);
  });
});
