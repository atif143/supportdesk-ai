import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Send every /api request to our backend
    proxy: {
      '/api': 'http://localhost:4000',
      // The WebSocket connection for real-time updates goes to the backend too
      '/socket.io': { target: 'http://localhost:4000', ws: true },
    },
  },
});
