import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),       
  ],
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'https://ai-proctoring-drrf.onrender.com',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['framer-motion', 'lucide-react', 'recharts'],
          'vendor-socket': ['socket.io-client']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  }
});
