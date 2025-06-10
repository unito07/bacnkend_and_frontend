import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // Import the 'path' module

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      // string shorthand: '/foo' -> 'http://localhost:4567/foo'
      // '/api': 'http://localhost:8000',
      // Proxying /api requests to the backend server running on port 8000
      '/api': {
        target: 'http://localhost:8000', // Your backend server address
        changeOrigin: true, // Recommended for virtual hosted sites
        // secure: false, // Uncomment if your backend is not using HTTPS (common in dev)
        // rewrite: (path) => path.replace(/^\/api/, ''), // Uncomment if you don't want /api in the proxied path
      },
      // You can add more proxies here if needed for other backend services
      // For example, if you had another service for /socket.io
      // '/socket.io': {
      //   target: 'ws://localhost:3001',
      //   ws: true,
      // },
    },
  },
})
