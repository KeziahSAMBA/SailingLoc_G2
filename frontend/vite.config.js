import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-http': ['axios'],
          'vendor-i18n': ['i18next', 'react-i18next'],
          'vendor-icons': ['react-icons'],
          'vendor-maps': ['leaflet', 'react-leaflet'],
          'vendor-motion': ['motion'],
        },
      },
    },
  },
  server: {
    port: 5173,
    watch: {
      usePolling: true,
      interval: 500,
    },
  },
});
