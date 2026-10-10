import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/build/**',
      '**/.svelte-kit/**',
      '**/*.svelte',
    ],
  },
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        module: 'readonly',
        exports: 'writable',
        require: 'readonly',
      },
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
      },
    },
  },
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['packages/core/**/*.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Use the seeded RNG. Math.random is forbidden in packages/core.',
        },
        {
          object: 'Date',
          property: 'now',
          message: 'Date.now is forbidden in packages/core. Pass time in explicitly.',
        },
      ],
    },
  },
  {
    files: ['packages/core/**/*.ts'],
    ignores: ['packages/core/**/*.test.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Use the seeded RNG. Math.random is forbidden in packages/core.',
        },
        {
          object: 'Date',
          property: 'now',
          message: 'Date.now is forbidden in packages/core. Pass time in explicitly.',
        },
        ...['exp', 'log', 'sin', 'cos', 'pow', 'log1p', 'expm1'].map((property) => ({
          object: 'Math',
          property,
          message: `Platform Math.${property} can differ across JavaScript engines. Use the helpers in math/elementary.ts.`,
        })),
      ],
    },
  },
);
