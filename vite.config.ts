import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  // 1. Esta es la línea CRUCIAL para GitHub Pages
  base: '/control-de-asistencia-qr-2/',
  
  // 2. Fusionamos todos los plugins aquí
  plugins: [react(), tailwindcss()],
  
  // 3. Mantenemos tus aliases
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  
  // 4. Mantenemos tu configuración del servidor
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
});
