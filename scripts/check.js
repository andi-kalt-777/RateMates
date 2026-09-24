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

// --- Kategorien: Registry und Definitionen im Gleichklang --------------------
const defsBlock = code.match(/const CATEGORY_DEFS\s*=\s*\{([\s\S]*?)\n\};/);
const groupsBlock = code.match(/const CATEGORY_GROUPS\s*=\s*\[([\s\S]*?)\n\];/);
if (!defsBlock || !groupsBlock) {
  fail("CATEGORY_DEFS oder CATEGORY_GROUPS nicht gefunden.");
} else {
  const defIds = [...defsBlock[1].matchAll(/^\s{2}(\w+)\s*:\s*\{/gm)].map((m) => m[1]);
  const grouped = [...groupsBlock[1].matchAll(/cats\s*:\s*\[([^\]]*)\]/g)]
    .flatMap((m) => [...m[1].matchAll(/"(\w+)"/g)].map((x) => x[1]));

  const missing = defIds.filter((id) => !grouped.includes(id));
  if (missing.length) {
    fail("Kategorie nicht in CATEGORY_GROUPS zugeordnet: " + missing.join(", "));
  } else {
    ok(`Alle ${defIds.length} Kategorien einer Obergruppe zugeordnet`);
  }

  // Jede Kategorie braucht ihren Eintrag in ALL_CATS (globale Übersichten)
  const inRegistry = [...code.matchAll(/\{id:"(\w+)",icon:"[^"]*",label:"[^"]*",base:/g)]
    .map((m) => m[1]);
  const notRegistered = defIds.filter((id) => !inRegistry.includes(id));
  if (notRegistered.length) {
    fail("Kategorie fehlt in ALL_CATS: " + notRegistered.join(", "));
  } else {
    ok("Alle Kategorien in ALL_CATS registriert");
  }

  // Und ihren Zweig im Mode-Routing
  const routed = [...code.matchAll(/mode==="(\w+)"/g)].map((m) => m[1]);
  const notRouted = defIds.filter(
    (id) => !routed.includes(id) && !["restaurant", "whisky"].includes(id)
  );
  if (notRouted.length) {
    fail("Kategorie ohne Mode-Routing: " + notRouted.join(", "));
  } else {
    ok("Alle Kategorien im Mode-Routing verdrahtet");
  }
}

// --- Datenbankregeln: jeder Firebase-Pfad braucht seinen Block ----------------
// Ohne Eintrag in database.rules.json ist ein Pfad für alle gesperrt — die
// Kategorie wäre dann sichtbar, aber jede Bewertung schlüge still fehl.
try {
  const rules = JSON.parse(
    fs.readFileSync(path.join(ROOT, "database.rules.json"), "utf8")
  ).rules;
  const paths = new Set(["restaurants", "suggestions", "whiskies", "whisky_suggestions"]);
  for (const m of code.matchAll(/fb(?:Base|Sugg)\s*:\s*"(\w+)"/g)) paths.add(m[1]);
  // Gruppeneigene Kategorien liegen unter custom_<id>; dafür steht ein $-Platzhalter
  // in den Regeln. Ein Präfix (endet auf "_") gilt als abgedeckt, wenn es ihn gibt.
  const hasWildcard = Object.keys(rules).some((k) => k.startsWith("$"));
  const unruled = [...paths].filter((p) =>
    p.endsWith("_") ? !hasWildcard : !(p in rules)
  );
  if (unruled.length) {
    fail("Firebase-Pfad ohne Datenbankregel: " + unruled.join(", "));
  } else {
    ok(`Alle ${paths.size} Firebase-Pfade in database.rules.json abgedeckt`);
  }
} catch (e) {
  fail("database.rules.json fehlt oder ist kein gültiges JSON: " + e.message);
}

if (failed) {
  console.log("\n❌ Prüfung fehlgeschlagen — bitte NICHT hochladen.");
  process.exit(1);
}
console.log("✓ Strukturprüfung bestanden, weiter mit ESLint und Build …\n");
