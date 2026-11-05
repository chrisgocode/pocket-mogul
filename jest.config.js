// Jest runs the screen tests only: React Native Testing Library on the
// jest-expo iOS preset. Logic tests (*.test.ts in src/domain, src/content and
// src/application) run under `bun test`, which can't load React Native.
/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo/ios',
  testMatch: ['<rootDir>/src/**/*.test.tsx'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};
