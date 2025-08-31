import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    base: '/youtube-to-sheets/',
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    define: {
      'import.meta.env': env,
      'process.env': env,
    },
  };
});
