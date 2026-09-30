import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // MapLibre files are copied verbatim from node_modules by prepare-map-assets.cjs.
  { ignores: ['node_modules/**', '.expo/**', 'dist/**', 'web-build/**', 'public/maplibre/**', 'supabase/functions/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,cjs,mjs,mts,ts,tsx}'],
    languageOptions: {
      globals: {
        console: 'readonly', process: 'readonly', module: 'readonly', require: 'readonly',
        __dirname: 'readonly', exports: 'readonly', fetch: 'readonly', setTimeout: 'readonly',
        clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly',
        window: 'readonly', document: 'readonly', navigator: 'readonly', URL: 'readonly',
        URLSearchParams: 'readonly', FormData: 'readonly', Blob: 'readonly', Request: 'readonly',
        Response: 'readonly', AbortController: 'readonly', TextEncoder: 'readonly', crypto: 'readonly',
      },
    },
    rules: {
      // Keep migration warnings visible without hiding correctness errors.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-require-imports': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
);
