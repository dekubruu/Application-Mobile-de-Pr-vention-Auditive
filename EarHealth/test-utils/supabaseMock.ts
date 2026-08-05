// Shared helper for mocking the Supabase client's fluent query builder in
// service-layer tests. Not a test file itself (excluded from Jest's testMatch
// since it doesn't live under a `__tests__` folder or end in .test.ts).
//
// Usage:
//   jest.mock('@/src/utils/supabase', () => ({ supabase: mockSupabase }));
//   // ^ the `mock` prefix is required for the jest.mock factory to see it
//   //   (babel-plugin-jest-hoist only allows referencing `mock*`-prefixed
//   //   identifiers from an out-of-scope jest.mock factory).
//
//   mockFrom.mockImplementation((table) =>
//     table === 'quiz_sessions' ? makeQueryResult({ data: [...], error: null }) : makeQueryResult({ data: [], error: null }),
//   );

export interface QueryResult {
  data?:  unknown;
  error?: { message: string; code?: string } | null;
  count?: number | null;
}

// A query builder mock: every chain method returns itself, so any call
// sequence (`.select().eq().order().limit()`, `.update().eq().gte()`, …)
// works regardless of which methods a given service call happens to use.
// The builder is also "thenable" so a bare `await query` (no trailing
// `.single()`/`.maybeSingle()`) resolves to the configured result, exactly
// like the real supabase-js PostgrestBuilder.
export function makeQueryResult(result: QueryResult) {
  const resolved: QueryResult = { data: null, error: null, count: null, ...result };

  const builder: Record<string, unknown> = {
    select:   jest.fn(() => builder),
    eq:       jest.fn(() => builder),
    in:       jest.fn(() => builder),
    order:    jest.fn(() => builder),
    limit:    jest.fn(() => builder),
    gte:      jest.fn(() => builder),
    lte:      jest.fn(() => builder),
    gt:       jest.fn(() => builder),
    lt:       jest.fn(() => builder),
    neq:      jest.fn(() => builder),
    is:       jest.fn(() => builder),
    upsert:   jest.fn(() => builder),
    update:   jest.fn(() => builder),
    insert:   jest.fn(() => builder),
    maybeSingle: jest.fn(() => Promise.resolve(resolved)),
    single:      jest.fn(() => Promise.resolve(resolved)),
    then: (
      onFulfilled?: (value: QueryResult) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(resolved).then(onFulfilled, onRejected),
  };
  return builder;
}

export const mockFrom = jest.fn();

export const mockAuth = {
  signInWithPassword: jest.fn(),
  signUp:             jest.fn(),
  signOut:            jest.fn(),
  getSession:         jest.fn(),
  onAuthStateChange:  jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
};

export const mockSupabase = {
  from: mockFrom,
  auth: mockAuth,
};

// Call in beforeEach to reset call history/implementations between tests.
export function resetSupabaseMock(): void {
  mockFrom.mockReset();
  mockAuth.signInWithPassword.mockReset();
  mockAuth.signUp.mockReset();
  mockAuth.signOut.mockReset();
  mockAuth.getSession.mockReset();
}
