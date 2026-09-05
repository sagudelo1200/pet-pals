module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'google',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['tsconfig.json', 'tsconfig.dev.json', 'tsconfig.test.json'],
    sourceType: 'module',
  },
  ignorePatterns: [
    '/lib/**/*', // Ignore built files.
    '/generated/**/*', // Ignore generated files.
    '/__tests__/**/*', // Ignore test files.
    '/scripts/**/*', // Ignore build scripts.
  ],
  plugins: ['@typescript-eslint', 'import', 'jsdoc'],
  rules: {
    'quotes': ['error', 'single'],
    'import/no-unresolved': 0,
    'indent': ['error', 2],
    'linebreak-style': 'off', // Allow CRLF on Windows
    // Disable strict JSDoc checks for this functions project to avoid
    // failing deploy when editor formatters remove or change comments.
    'valid-jsdoc': 'off',
    'jsdoc/require-jsdoc': 'off',
    'jsdoc/require-param': 'off',
    'jsdoc/require-returns': 'off',
    // Allow longer lines to accommodate formatter differences (Prettier)
    'max-len': ['error', {code: 90}],
  },
};
