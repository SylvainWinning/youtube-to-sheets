import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/youtube-to-sheets/',
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // Only expose the required variables instead of the entire environment.
  envPrefix: ['VITE_', 'SPREADSHEET_ID', 'YOUTUBE_API_KEY'],
});
