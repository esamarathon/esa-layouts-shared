module.exports = {
  extends: ['../.eslintrc.extension.js'],
  parserOptions: {
    project: 'tsconfig.json',
  },
  rules: {
    // @typescript-eslint/no-unused-vars does not work with type definitions
    '@typescript-eslint/no-unused-vars': 'off',
    // Sometimes eslint complains about this for types (usually when using namespaces).
    'import/prefer-default-export': 'off',
    'max-len': 'off',
    'import/no-extraneous-dependencies': ['error', {
      devDependencies: false,
      optionalDependencies: false,
      packageDir: ['..']
    }],
  },
};
