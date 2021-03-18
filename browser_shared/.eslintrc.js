module.exports = {
  extends: ['../.eslintrc.browser.js'],
  parserOptions: {
    project: 'tsconfig.json',
  },
  rules: {
    'import/no-extraneous-dependencies': ['error', {
      devDependencies: true, // Everything is compiled for the browser so dev dependencies are fine.
      optionalDependencies: false,
      packageDir: ['..']
    }],
  },
};
