import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@legacyupgrader/shared-types': path.resolve(
          __dirname,
          '../../packages/shared-types/src/index.ts',
        ),
      },
    },
    server: {
      port: Number(env.VITE_PORT) || 5173,
      host: true,
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET ?? 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: Number(env.VITE_PORT) || 4173,
      host: true,
    },
  };
});
