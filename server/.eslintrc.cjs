module.exports = {
  root: false,
  extends: ['../.eslintrc.base.json'],
  env: { node: true },
  rules: {
    '@typescript-eslint/no-var-requires': 'off',
  },
};
