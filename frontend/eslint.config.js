import js from '@eslint/js';
import react from 'eslint-plugin-react';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: {
      react,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        Intl: 'readonly',
        AbortController: 'readonly',
        ResizeObserver: 'readonly',
      },
    },
    rules: {
      'react/jsx-uses-vars': 'error',
    },
  },
  {
    // Les tests exercent des API que l'application n'utilise pas directement :
    // File pour un envoi multipart simulé, Storage pour faire échouer le
    // stockage à volonté. Les déclarer ici plutôt que d'élargir les globales de
    // l'application, qui doit rester la liste de ce qu'elle emploie vraiment.
    files: ['src/**/*.test.{js,jsx}', 'src/tests/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        File: 'readonly',
        Blob: 'readonly',
        Storage: 'readonly',
        Event: 'readonly',
        IntersectionObserver: 'readonly',
      },
    },
  },
];
