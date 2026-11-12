import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React and core libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // UI libraries
          'ui-vendor': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-progress',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toggle',
            '@radix-ui/react-tooltip',
          ],

          // Form and validation libraries
          'form-vendor': [
            'formik',
            'react-hook-form',
            '@hookform/resolvers',
            'yup',
            'zod',
            'simple-react-validator',
          ],

          // Data and state management
          'data-vendor': ['@tanstack/react-query', 'zustand', 'react-secure-storage'],

          // Native API and client shell
          'api-vendor': ['axios'],

          // Maps and location
          'map-vendor': ['leaflet', 'react-leaflet'],

          // Utilities
          'utils-vendor': [
            'date-fns',
            'dayjs',
            'copy-to-clipboard',
            'short-unique-id',
            'simple-crypto-js',
            'simple-xml-to-json',
            'jwt-decode',
            'set-interval-async',
          ],

          // Image and media
          'media-vendor': ['react-dropzone', 'react-easy-crop', 'qr-scanner', 'react-editext'],

          // Email and notifications
          'email-vendor': ['resend', 'sonner'],

          // Development and build tools (only in dev)
          ...(process.env.NODE_ENV === 'development'
            ? {
                'dev-vendor': ['workbox-window'],
              }
            : {}),
        },
      },
    },
    // Increase chunk size warning limit slightly, but still warn for very large chunks
    chunkSizeWarningLimit: 1000,
  },
});
