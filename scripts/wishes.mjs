#!/usr/bin/env node
/**
 * Kategorie-Wünsche auswerten. In der App sieht sie niemand; hier liest die
 * angemeldete Firebase CLI sie als Admin aus und zeigt eine Rangliste.
 *
 *   npm run wishes
 */
import { execSync } from "node:child_process";
import { rankWishes } from "../src/lib/wishes.js";

let data;
try {
  const out = execSync("firebase database:get /category_requests --project montagabendrestaurants", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  data = JSON.parse(out);
} catch (e) {
  console.error("Konnte die Wünsche nicht lesen. Ist die Firebase CLI angemeldet (firebase login)?");
  console.error(String(e.stderr || e.message).trim());
  process.exit(1);
}

const list = rankWishes(data);
if (!list.length) {
  console.log("Noch keine Kategorie-Wünsche.");
  process.exit(0);
}
console.log("Kategorie-Wünsche (" + list.length + "), meiste Stimmen zuerst:\n");
for (const w of list) {
  console.log(String(w.count).padStart(3) + "  " + w.name + "   (" + w.people.join(", ") + ")");
  for (const n of w.notes) console.log("       " + n);
}
