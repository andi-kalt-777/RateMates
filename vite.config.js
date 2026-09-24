import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages liefert die App unter /RateMates/ aus.
export default defineConfig({
  base: "/RateMates/",
  plugins: [react()],
  // Das Firebase-compat-SDK allein ist gut 400 kB; bis zum Wechsel auf das
  // modulare SDK ist ein Paket über 500 kB normal.
  build: { chunkSizeWarningLimit: 800 },
});
