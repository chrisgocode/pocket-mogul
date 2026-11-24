module.exports = {
  preset: 'jest-expo/ios',
  testMatch: ['<rootDir>/src/**/*.test.tsx'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  maxWorkers: 2,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  testTimeout: 15_000,
};
