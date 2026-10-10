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
);
