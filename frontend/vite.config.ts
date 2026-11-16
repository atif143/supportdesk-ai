import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Send every /api request to our backend
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
