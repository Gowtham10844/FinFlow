// vite.admin.config.js — Admin Panel (port 5174)
// Serves admin.html (src/admin.jsx → AdminApp) as the root page.
// When you visit http://localhost:5174/ you get the admin login, NOT the user portal.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Middleware plugin: redirect / and /index.html → /admin.html so Vite
// serves the correct HTML entry in dev mode.
function adminEntryPlugin() {
  return {
    name: 'admin-entry',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/' || req.url === '/index.html') {
          req.url = '/admin.html';
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), adminEntryPlugin()],
  root: '.',
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist-admin',
    rollupOptions: {
      input: {
        main: './admin.html',
      },
    },
  },
});

