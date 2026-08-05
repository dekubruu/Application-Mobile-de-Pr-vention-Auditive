/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Explicit, narrow testMatch: only files inside a `__tests__` folder ending
  // in `.test.ts(x)`. The default Jest pattern also matches any file whose
  // basename simply contains "test" (e.g. `app/(tabs)/test.tsx`, a real
  // screen, not a test file) — which this project has.
  testMatch: ['<rootDir>/**/__tests__/**/*.test.[jt]s?(x)'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/test-utils/',
  ],
  collectCoverageFrom: [
    'features/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'constants/**/*.{ts,tsx}',
    'src/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],
};
