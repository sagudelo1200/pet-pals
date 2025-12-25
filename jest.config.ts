import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  // Allow transforming react-native and related packages which ship non-compiled
  // JS (flow/ESM) so Jest can parse them during tests.
  transformIgnorePatterns: [
    'node_modules/(?!react-native|@react-native|react-native-.*)',
  ],
  moduleNameMapper: {
    '^@/firebase.config$': '<rootDir>/__mocks__/firebase.config.ts',
    '^@\\/(.*)$': '<rootDir>/$1',
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
    '^expo-constants$': '<rootDir>/__mocks__/expo-constants.js',
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/__mocks__/async-storage.js',
    '^galio-framework$': '<rootDir>/__mocks__/galio-framework.js',
  },
  testMatch: ['**/__tests__/**/*.test.(ts|tsx|js)'],
  collectCoverageFrom: [
    'services/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'models/**/*.{ts,tsx}',
  ],
}

export default config
