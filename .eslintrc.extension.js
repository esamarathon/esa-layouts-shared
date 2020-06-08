module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
  },
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'airbnb-base',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
  ],
  settings: {
    'import/core-modules': ['nodecg/types/server'],
    'import/extensions': ['.js', '.jsx', '.ts', '.tsx'],
  },
  rules: {
    'import/extensions': ['error', 'ignorePackages', {
      js: 'never',
      jsx: 'never',
      ts: 'never',
      tsx: 'never',
    }],
    'import/no-extraneous-dependencies': ['error', {
      packageDir: ['.', '../..'],
    }],
    'lines-between-class-members': 'off',
    'max-len': ['error', { 'code': 100 }],
    'class-methods-use-this': 'off',
  },
};
