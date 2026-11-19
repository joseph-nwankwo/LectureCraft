import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
      diagnostics: false,
    }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/__tests__/**',
    '!src/**/*.d.ts',
    '!src/app.ts',
  ],
  // Temporary baseline thresholds measured from CI run #6 (commit 1ff1cf6).
  // These are NOT long-term targets — they enforce a floor so coverage cannot
  // silently regress. Raise each value progressively as meaningful tests are
  // added; do not lower them further.
  coverageThreshold: {
    global: {
      branches:   11,
      functions:  10,
      lines:      18,
      statements: 17,
    },
  },
  setupFilesAfterEnv: [],
  testTimeout: 30000,
  clearMocks: true,
  restoreMocks: true,
}

export default config
