#!/usr/bin/env node
/**
 * Prüft index.html, bevor sie live geht.
 *
 * Die App hat keinen Build-Schritt: ein Syntaxfehler fällt sonst erst im Browser
 * auf — als weiße Seite. Dieses Skript kompiliert den <script type="text/babel">
 * Block mit demselben Babel, das auch im Browser läuft.
 *
 *   node scripts/check.js          (oder: npm run check)
 */

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "index.html");

let babel;
try {
  babel = require("@babel/standalone");
} catch {
  console.error("❌ @babel/standalone fehlt. Einmalig ausführen:  npm install");
  process.exit(1);
}

const html = fs.readFileSync(FILE, "utf8");
let failed = false;
const fail = (msg) => { console.error("❌ " + msg); failed = true; };
const ok = (msg) => console.log("✓ " + msg);

// --- Babel-Block herausschneiden --------------------------------------------
const match = html.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
if (!match) {
  fail('Kein <script type="text/babel"> Block gefunden.');
  process.exit(1);
}
const code = match[1];

// --- Kompilierung ------------------------------------------------------------
// Babel ist der maßgebliche Prüfer: es findet fehlende Klammern, abgeschnittene
// Bearbeitungen und jeden anderen Syntaxfehler zuverlässig.
try {
  babel.transform(code, { presets: ["react"] });
  ok("Babel-Kompilierung erfolgreich");
} catch (e) {
  fail("SYNTAXFEHLER:\n   " + e.message.split("\n").slice(0, 8).join("\n   "));
}

// --- Gepinnte Skript-Versionen ----------------------------------------------
// Eine ungepinnte Babel-URL hat die App schon einmal tagelang lahmgelegt.
const pinned = [
  "react@18.2.0/umd/react.production.min.js",
  "react-dom@18.2.0/umd/react-dom.production.min.js",
  "@babel/standalone@7.23.10/babel.min.js",
  "firebasejs/9.23.0/firebase-app-compat.js",
  "firebasejs/9.23.0/firebase-database-compat.js",
  "firebasejs/9.23.0/firebase-auth-compat.js",
];
const unpinned = pinned.filter((p) => !html.includes(p));
if (unpinned.length) {
  fail("Skript-Version nicht gepinnt: " + unpinned.join(", "));
} else {
  ok("Alle Skript-Versionen gepinnt");
}

// --- Firebase-Konfiguration --------------------------------------------------
if (/DEIN_API_KEY|DEIN_PROJEKT_ID/.test(html)) {
  fail("Firebase-Konfiguration enthält noch Platzhalter.");
} else {
  ok("Firebase-Konfiguration gesetzt");
}

// --- Kategorien: Registry und Definitionen im Gleichklang --------------------
const defsBlock = html.match(/const CATEGORY_DEFS\s*=\s*\{([\s\S]*?)\n\};/);
const groupsBlock = html.match(/const CATEGORY_GROUPS\s*=\s*\[([\s\S]*?)\n\];/);
if (defsBlock && groupsBlock) {
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
  const inRegistry = [...html.matchAll(/\{id:"(\w+)",icon:"[^"]*",label:"[^"]*",base:/g)]
    .map((m) => m[1]);
  const notRegistered = defIds.filter((id) => !inRegistry.includes(id));
  if (notRegistered.length) {
    fail("Kategorie fehlt in ALL_CATS: " + notRegistered.join(", "));
  } else {
    ok("Alle Kategorien in ALL_CATS registriert");
  }

  // Und ihren Zweig im Mode-Routing
  const routed = [...html.matchAll(/mode==="(\w+)"/g)].map((m) => m[1]);
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
    fs.readFileSync(path.join(__dirname, "..", "database.rules.json"), "utf8")
  ).rules;
  const paths = new Set(["restaurants", "suggestions", "whiskies", "whisky_suggestions"]);
  for (const m of html.matchAll(/fb(?:Base|Sugg)\s*:\s*"(\w+)"/g)) paths.add(m[1]);
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

console.log(
  failed
    ? "\n❌ Prüfung fehlgeschlagen — bitte NICHT hochladen."
    : "\n✅ Alles in Ordnung."
);
process.exit(failed ? 1 : 0);
