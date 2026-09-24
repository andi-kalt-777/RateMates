#!/usr/bin/env node
/**
 * Einmaliger Umzug von Gruppen zu Freundschaften (24.09.2026).
 * Wer mit jemandem in einer Gruppe ist, wird dessen Freund; eigene Kategorien sind
 * alle Kategorien der eigenen Gruppen. Die Gruppen selbst bleiben unverändert liegen.
 *
 *   firebase database:get /groups > groups.json
 *   firebase database:get /names  > names.json
 *   node scripts/migrate-friends.mjs groups.json names.json update.json   # zeigt die Liste, schreibt update.json
 *   firebase database:update / update.json                               # erst nach Prüfung der Liste
 */
import fs from "node:fs";
import { migrationFromGroups } from "../src/lib/friends.js";

const [groupsFile, namesFile, outFile] = process.argv.slice(2);
if (!outFile) {
  console.error("Aufruf: node scripts/migrate-friends.mjs groups.json names.json update.json");
  process.exit(1);
}
const read = (f) => { const s = fs.readFileSync(f, "utf8"); return JSON.parse(s.charCodeAt(0) === 0xfeff ? s.slice(1) : s) || {}; };
const groups = read(groupsFile);
const names = Object.values(read(namesFile));
const upd = migrationFromGroups(groups, names, Date.now());

const friends = {};
const cats = {};
for (const k of Object.keys(upd)) {
  const [root, a, x, c] = k.split("/");
  if (root === "friends") (friends[a] ||= []).push(x);
  else (cats[a] ||= []).push(c);
}
console.log("Freundschaften:");
for (const a of Object.keys(friends).sort()) console.log("  " + a + ": " + friends[a].sort().join(", "));
console.log("\nKategorien:");
for (const a of Object.keys(cats).sort()) console.log("  " + a + ": " + cats[a].join(", "));
const skipped = [...new Set(Object.values(groups).flatMap((g) => Object.keys(g.members || {})))].filter((n) => !names.includes(n));
if (skipped.length) console.log("\nNicht mehr vorhandene Konten (übersprungen): " + skipped.join(", "));
fs.writeFileSync(outFile, JSON.stringify(upd, null, 2));
console.log("\n" + Object.keys(upd).length + " Einträge nach " + outFile + " geschrieben.");
