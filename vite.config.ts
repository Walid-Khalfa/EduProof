import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import componentTagger from './plugins/component-tagger';

const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL || process.env.VITE_API_URL || 'http://localhost:3001';

  return {
    plugins: [react(), componentTagger()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify('1.0.0'),
    },
    build: {
      target: 'es2022',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction,
          pure_funcs: isProduction ? ['console.log', 'console.warn', 'console.info'] : [],
        },
      },
      sourcemap: !isProduction,
    },
    server: {
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
        },
      },
      hmr: {
        overlay: false,
        timeout: 15000,
      },
      watch: {
        usePolling: true,
        interval: 500,
        binaryInterval: 500,
      },
    },
  };
});
