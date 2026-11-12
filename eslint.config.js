import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'node_modules', 'playwright-report', 'test-results']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Legacy screens are being retired screen-by-screen. Keep them visible as
      // warnings so the new discovery/onboarding surfaces can enforce a clean
      // zero-error lint gate while the old complaints are burned down.
      'no-unused-vars': [
        'warn',
        { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' },
      ],
      'no-case-declarations': 'warn',
      'no-useless-escape': 'warn',
      'react-refresh/only-export-components': 'warn',
    },
  },
  {
    files: [
      'vite.config.js',
      'eslint.config.js',
      'playwright.config.js',
      'e2e/**/*.js',
    ],
    languageOptions: {
      globals: globals.node,
    },
  },
]);
