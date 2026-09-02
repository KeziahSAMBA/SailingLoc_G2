import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    watch: {
      usePolling: true,
      interval: 500,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/tests/setup.js',
    include: ['src/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov'],
      reportsDirectory: 'coverage',
      // Sans cette liste, seuls les fichiers effectivement importés par un test
      // sont comptés : le pourcentage affiché flatte le code non testé au lieu
      // de le signaler. C'est exactement l'erreur qui a fait croire à 48 % de
      // couverture côté backend alors que la réalité était 27 %.
      all: true,
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/main.jsx',
        'src/tests/**',
        // Table de traductions : 3 685 lignes de données, aucune logique.
        'src/i18n/texts.js',
        '**/*.test.{js,jsx}',
      ],
    },
  },
});
