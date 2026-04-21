import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  assetsInclude: ['**/*.glb', '**/*.ktx2', '**/*.gltf'],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          pixi: ['pixi.js']
        }
      }
    }
  },
  server: {
    host: true,
    port: 3000,
    open: true
  }
})
