import fs from "node:fs";
import crypto from "node:crypto";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Service Worker aus src/sw.js: trägt beim Build alle erzeugten Dateien und eine
// Version ein (Hash über den Worker selbst, die Dateinamen – die tragen einen
// Inhalts-Hash – und den Inhalt der Dateien aus public/). Jeder Build mit geänderten Dateien ergibt damit
// einen neuen Worker, der die alten Stände wegräumt.
function serviceWorker() {
  return {
    name: "ratemates-sw",
    apply: "build",
    generateBundle(_, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith(".map"));
      const pub = fs.readdirSync("public");
      const precache = ["./", ...files.filter((f) => f !== "index.html"), ...pub].map((f) => (f === "./" ? f : "./" + f));
      const template = fs.readFileSync("src/sw.js", "utf8");
      const hash = crypto.createHash("sha256").update(template).update(precache.join("|"));
      for (const f of pub) hash.update(fs.readFileSync("public/" + f));
      const version = hash.digest("hex").slice(0, 12);
      const source = template
        .replace('VERSION="__VERSION__"', 'VERSION="' + version + '"')
        .replace("PRECACHE=__PRECACHE__", "PRECACHE=" + JSON.stringify(precache));
      if (source.includes("VERSION=\"__VERSION__\"") || source.includes("PRECACHE=__PRECACHE__")) {
        this.error("src/sw.js: Platzhalter nicht gefunden");
      }
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}

// GitHub Pages liefert die App unter /RateMates/ aus.
export default defineConfig({
  base: "/RateMates/",
  plugins: [react(), serviceWorker()],
  // Das Firebase-compat-SDK allein ist gut 400 kB; bis zum Wechsel auf das
  // modulare SDK ist ein Paket über 500 kB normal.
  build: { chunkSizeWarningLimit: 800 },
});
