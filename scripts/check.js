#!/usr/bin/env node
/**
 * Strukturprüfungen, die weder Linter noch Build abdecken.
 * Läuft als erster Teil von `npm run check` (danach ESLint und vite build).
 *
 *   node scripts/check.js
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = false;
const fail = (msg) => { console.error("❌ " + msg); failed = true; };
const ok = (msg) => console.log("✓ " + msg);

// Gesamter App-Quelltext, damit die Prüfungen unabhängig von der Dateiaufteilung sind
const readAll = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  if (e.isDirectory()) return readAll(p);
  return /\.(js|jsx)$/.test(e.name) ? [fs.readFileSync(p, "utf8")] : [];
});
const code = readAll(path.join(ROOT, "src")).join("\n");

// --- Gepinnte Versionen ---------------------------------------------------------
// Eine ungepinnte Babel-URL hat die App schon einmal tagelang lahmgelegt. Deshalb
// stehen alle Abhängigkeiten mit exakter Version in package.json.
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const loose = Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })
  .filter(([, v]) => !/^\d+\.\d+\.\d+$/.test(v))
  .map(([n, v]) => n + "@" + v);
if (loose.length) fail("Version nicht exakt gepinnt: " + loose.join(", "));
else ok("Alle Abhängigkeiten exakt gepinnt");

// --- Firebase-Konfiguration --------------------------------------------------
if (/DEIN_API_KEY|DEIN_PROJEKT_ID/.test(code)) {
  fail("Firebase-Konfiguration enthält noch Platzhalter.");
} else {
  ok("Firebase-Konfiguration gesetzt");
}

// --- Kategorien --------------------------------------------------------------
// Quelle ist src/categories/definitions.js; Registry-Konsistenz prüfen die Tests.
const { DEFINITIONS } = await import(
  new URL("../src/categories/definitions.js", import.meta.url).href
);
const ids = DEFINITIONS.map((d) => d.id);
ok(`${ids.length} Kategorien definiert`);

// --- Datenbankregeln: jeder Firebase-Pfad braucht seinen Block ----------------
// Ohne Eintrag in database.rules.json ist ein Pfad für alle gesperrt — die
// Kategorie wäre dann sichtbar, aber jede Bewertung schlüge still fehl.
try {
  const rules = JSON.parse(
    fs.readFileSync(path.join(ROOT, "database.rules.json"), "utf8")
  ).rules;
  const paths = DEFINITIONS.flatMap((d) => [d.paths.items, d.paths.suggestions]);
  const unruled = paths.filter((p) => !(p in rules));
  if (unruled.length) {
    fail("Firebase-Pfad ohne Datenbankregel: " + unruled.join(", "));
  } else {
    ok(`Alle ${paths.length} Kategorie-Pfade in database.rules.json abgedeckt`);
  }
} catch (e) {
  fail("database.rules.json fehlt oder ist kein gültiges JSON: " + e.message);
}

if (failed) {
  console.log("\n❌ Prüfung fehlgeschlagen — bitte NICHT hochladen.");
  process.exit(1);
}
console.log("✓ Strukturprüfung bestanden, weiter mit ESLint und Build …\n");
