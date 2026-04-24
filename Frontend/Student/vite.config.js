// vite.config.js  (must be at project root)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 3002,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-socket': ['socket.io-client'],
          // We can optionally explicitly list tensorflow, though dynamic imports 
          // naturally get their own chunks anyway.
          'vendor-tfjs': ['@tensorflow/tfjs']
        }
      }
    },
    chunkSizeWarningLimit: 1500, // Increased to suppress the warning for the large TensorFlow chunk
  }
})