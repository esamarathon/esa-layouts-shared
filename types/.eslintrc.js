module.exports = {
  root: true,
  env: {
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
  },
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'airbnb-typescript/base',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
  ],
  settings: {
    'import/resolver': {
      typescript: {
        // intentionally left blank
      },
    },
  },
  rules: {
    'import/extensions': ['error', 'ignorePackages', {
      js: 'never',
      jsx: 'never',
      ts: 'never',
      tsx: 'never',
    }],
    // 'max-len': ['error', { code: 100, ignorePattern: '^import\\s.+\\sfrom\\s.+;$' }],
    // '@typescript-eslint/lines-between-class-members': 'off',

    // @typescript-eslint/no-unused-vars does not work with type definitions
    '@typescript-eslint/no-unused-vars': 'off',
    // Sometimes eslint complains about this for types (usually when using namespaces).
    'import/prefer-default-export': 'off',
    // Types are only used for development (usually!) so dev dependencies are fine.
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
  },
};
