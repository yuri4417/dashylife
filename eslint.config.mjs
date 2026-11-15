import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    rules: {
      'no-debugger': 'error',
      'no-duplicate-case': 'error',
      'no-sparse-arrays': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { parser: tsParser },
  },
];
