import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [react()],
    resolve: {
      alias: {
        '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
        '@layouts': fileURLToPath(new URL('./src/layouts', import.meta.url)),
        '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
        '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
        '@domain': fileURLToPath(new URL('./src/domain', import.meta.url)),
        '@mocks': fileURLToPath(new URL('./src/mocks', import.meta.url)),
      },
    },
  };
});
