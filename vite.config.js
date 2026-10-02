import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020',
    cssMinify: true,
    // Los videos viven en /public/media y se copian tal cual (no se inlinean)
    assetsInlineLimit: 4096,
  },
  server: {
    port: 5173,
    // En Windows (y rutas con espacios como "web koi") el watcher nativo a veces no
    // detecta cambios; el polling es un poco más costoso pero confiable.
    watch: { usePolling: true, interval: 300 },
  },
});
