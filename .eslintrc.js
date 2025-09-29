module.exports = {
  extends: ['react-app', 'plugin:react-hooks/recommended'],
  rules: {
    'no-unused-vars': 'warn',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
  env: {
    browser: true,
    es2021: true,
    jest: true,
  },
};
