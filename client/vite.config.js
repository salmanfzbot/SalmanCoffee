import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
// Built front end goes to ../public, served by server/index.js.
export default defineConfig({
  root: here,
  plugins: [react()],
  build: { outDir: path.resolve(here, '../public'), emptyOutDir: true, assetsDir: 'assets', rollupOptions: { output: { entryFileNames: 'assets/app.js', assetFileNames: 'assets/[name][extname]' } } },
  server: { proxy: { '/api': 'http://localhost:8080', '/images': 'http://localhost:8080' } }
});
