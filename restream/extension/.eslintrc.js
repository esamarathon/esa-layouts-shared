module.exports = {
  extends: ['../../.eslintrc.extension.js'],
  parserOptions: {
    project: 'tsconfig.json',
  },
  rules: {
    'max-classes-per-file': 'off',
    '@typescript-eslint/naming-convention': 'off',
  },
};
