// Global test setup — runs after the Jest test framework is installed, before
// each test file. Keep this file limited to mocks needed by (almost) every
// test; feature-specific mocks (expo-audio, expo-file-system, expo-print,
// expo-sharing, expo-web-browser…) belong in the test files that need them.

// Note: @testing-library/react-native v12+ ships its jest matchers
// (toBeVisible, toHaveTextContent, …) built in — no separate extend-expect
// import needed.

// Safety net: `src/utils/supabase.ts` calls createClient() at module load
// time and throws if these env vars are missing. Jest doesn't load `.env`
// (unlike the Expo dev server), so any test that transitively imports the
// real module — even accidentally, e.g. via `jest.requireActual` — would
// otherwise crash with "supabaseUrl is required." Tests that talk to
// Supabase should still mock '@/src/utils/supabase' explicitly; this only
// stops an unrelated accidental import from taking down the whole suite.
process.env.EXPO_PUBLIC_SUPABASE_URL ??= 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_KEY ??= 'test-anon-key';

// AsyncStorage: official in-memory mock shipped with the package.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// react-native-safe-area-context: SafeAreaView/useSafeAreaInsets need a
// provider in real usage; the package ships a test-only mock with sane
// default insets so components using it can render standalone.
// NOTE: the shipped mock file is `export default {...}` (TS/ESM), which
// CJS interop nests under `.default` — returning the bare require() result
// left every named import (SafeAreaView, useSafeAreaInsets, …) undefined.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

// expo-crypto: deterministic, incrementing UUID instead of real randomness —
// keeps assertions on generated ids stable across test runs. getRandomBytes
// (used by LargeSecureStore's AES key generation) delegates to Node's real
// crypto so encryption round-trips still behave like actual randomness.
jest.mock('expo-crypto', () => {
  let counter = 0;
  const nodeCrypto = require('crypto');
  return {
    randomUUID: jest.fn(() => `test-uuid-${++counter}`),
    getRandomBytes: jest.fn((byteCount: number) => new Uint8Array(nodeCrypto.randomBytes(byteCount))),
  };
});

// expo-secure-store: in-memory fake (no official jest mock is shipped).
jest.mock('expo-secure-store', () => {
  const mockStore = new Map<string, string>();
  return {
    getItemAsync: jest.fn((key: string) => Promise.resolve(mockStore.get(key) ?? null)),
    setItemAsync: jest.fn((key: string, value: string) => { mockStore.set(key, value); return Promise.resolve(); }),
    deleteItemAsync: jest.fn((key: string) => { mockStore.delete(key); return Promise.resolve(); }),
  };
});

// expo-router: every screen under app/ uses this. Provide jest.fn() spies for
// the navigation actions so tests can assert on calls, plus no-op stand-ins
// for the layout components (Stack/Tabs) used by _layout.tsx files.
jest.mock('expo-router', () => {
  const React = require('react');
  const push = jest.fn();
  const replace = jest.fn();
  const back = jest.fn();
  const useRouter = () => ({ push, replace, back });

  const Screen = () => null;
  const Slot = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children ?? null);

  return {
    __esModule: true,
    useRouter,
    router: { push, replace, back },
    useLocalSearchParams: jest.fn(() => ({})),
    useSegments: jest.fn(() => []),
    useRootNavigationState: jest.fn(() => ({ key: 'test-root' })),
    useFocusEffect: jest.fn(),
    usePathname: jest.fn(() => '/'),
    Link: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children ?? null),
    Redirect: () => null,
    Slot,
    Stack: Object.assign(
      ({ children }: { children?: React.ReactNode }) =>
        React.createElement(React.Fragment, null, children ?? null),
      { Screen },
    ),
    Tabs: Object.assign(
      ({ children }: { children?: React.ReactNode }) =>
        React.createElement(React.Fragment, null, children ?? null),
      { Screen },
    ),
  };
});

// Silence noisy but expected console.warn calls from resilient-save error
// paths under test (e.g. "getQuestionCoverage: ... failed") — assertions on
// specific warnings still work via jest.spyOn in the tests that need them.
const originalWarn = console.warn;
beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
});
afterAll(() => {
  console.warn = originalWarn;
});
