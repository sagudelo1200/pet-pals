/**
 * Jest para tests unitarios de Cloud Functions (sin emulador).
 *
 * - Se ejecuta con el jest/ts-jest del repo raíz:
 *     npx jest --config functions/jest.config.js --runInBand
 * - Usa `isolatedModules: true` (transpilación sin type-check) para no
 *   depender del tsconfig del app (que excluye `functions/`).
 * - El type-check real del código de las CFs lo hace `npm run build` (tsc)
 *   dentro de `functions/`.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { isolatedModules: true }],
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
}
