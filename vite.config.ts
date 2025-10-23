import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import componentTagger from './plugins/component-tagger';

export default defineConfig({
  plugins: [react(), componentTagger()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxying:', req.method, req.url, '→', options.target);
          });
        },
      },
    },
    hmr: {
      overlay: false,
      timeout: 15000,
    },
    watch: {
      // Use polling instead of native file system events (more reliable for some environments)
      usePolling: true,
      // Wait 500ms before triggering a rebuild (gives time for all files to be flushed)
      interval: 500,
      // Additional delay between file change detection and reload
      binaryInterval: 500,
    },
  },
});
