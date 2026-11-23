import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Send every /api request to our backend
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
