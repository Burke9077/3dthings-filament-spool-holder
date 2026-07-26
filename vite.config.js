import { defineConfig } from "vite";

export default defineConfig({
  base: "/3dthings-filament-spool-holder/",
  build: {
    target: "es2022",
    sourcemap: true,
    // The 3D viewer is a lazy-loaded Three.js chunk; the initial UI stays small.
    chunkSizeWarningLimit: 550,
  },
  test: {
    environment: "node",
  },
});
