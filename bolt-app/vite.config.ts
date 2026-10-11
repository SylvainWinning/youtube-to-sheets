import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/youtube-to-sheets/',
  // Only Vite's built-in constants (e.g. BASE_URL) are public.
  // Even VITE_* variables must stay out of the browser bundle.
  envPrefix: [],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
