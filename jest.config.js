module.exports = {
  preset: 'jest-expo/ios',
  testMatch: ['<rootDir>/src/**/*.test.tsx'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};
