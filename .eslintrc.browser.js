const path = require('path');

module.exports = {
  root: true,
  env: {
    node: true,
  },
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    // project: 'tsconfig.json',
    extraFileExtensions: ['.vue'],
    ecmaVersion: 2020,
  },
  globals: {
    nodecg: 'readonly',
    NodeCG: 'readonly',
  },
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'plugin:vue/essential',
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
    'import/no-extraneous-dependencies': ['error', {
      devDependencies: true, // Everything is compiled for the browser so dev dependencies are fine.
      optionalDependencies: false,
      packageDir: ['.', '../..']
    }],
    // max-len set to ignore "import" lines (as they usually get long and messy).
    'max-len': ['error', { code: 100, ignorePattern: '^import\\s.+\\sfrom\\s.+;$' }],
    '@typescript-eslint/lines-between-class-members': 'off',
    'class-methods-use-this': 'off',
    'no-param-reassign': ['error', {
      props: true,
      ignorePropertyModificationsFor: [
        'state', // for vuex state
        'acc', // for reduce accumulators
        'e', // for e.returnvalue
      ],
    }],
  }
};
