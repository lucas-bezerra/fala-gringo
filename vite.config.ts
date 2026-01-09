import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), nodePolyfills({ include: ['fs'] })],
      define: {
        'process.env.APP_PASSWORD_HASH': JSON.stringify(env.APP_PASSWORD_HASH),
        'process.env.BASE_URL': JSON.stringify(env.BASE_URL)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
