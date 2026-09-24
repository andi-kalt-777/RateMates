import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";

vi.mock("../firebase.js", () => ({ firebase: {}, db: {}, auth: {} }));

const { DEFINITIONS, CATEGORY_DEFS, CATEGORY_GROUPS, ALL_CATS, configFor, customConfig } = await import("./index.js");

// Stand vor dem Umbau auf Definitionen (24.09.2026), aus den alten Konstanten erzeugt
const before = JSON.parse(fs.readFileSync(new URL("./__fixtures__/vor-umbau.json", import.meta.url), "utf8"));

// Film und Serie hatten kein starsLabel; die Ansicht nahm dann "⭐ Gesamtwertung"
const effective = (cfg) => ({ ...cfg, starsLabel: cfg.starsLabel || "⭐ Gesamtwertung" });

describe("Definitionen ergeben denselben Stand wie vor dem Umbau", () => {
  it("CATEGORY_DEFS", () => {
    expect(CATEGORY_DEFS).toEqual(before.CATEGORY_DEFS);
  });

  it("CATEGORY_GROUPS mit Reihenfolge", () => {
    expect(CATEGORY_GROUPS).toEqual(before.CATEGORY_GROUPS);
  });

  it("ALL_CATS mit Reihenfolge, Pfaden und Art", () => {
    const now = ALL_CATS.map(({ cfg, ...rest }) => rest);
    const old = before.ALL_CATS.map(({ cfgName, ...rest }) => rest);
    expect(now).toEqual(old);
  });

  it("jede Media-Konfiguration entspricht der alten (ohne die ungenutzten Farbpaletten)", () => {
    for (const c of before.ALL_CATS.filter((x) => x.cfgName)) {
      expect(effective(configFor(c.id)), c.id).toEqual(effective(before.configs[c.cfgName]));
      expect(ALL_CATS.find((x) => x.id === c.id).cfg, c.id).toBe(configFor(c.id));
    }
  });
});

describe("Definitionen sind vollständig", () => {
  it("jede hat Pfade, Feld 1, Auswahl, Gesamtwertung, Kriterien und Texte", () => {
    for (const d of DEFINITIONS) {
      expect(d.paths.items && d.paths.suggestions, d.id).toBeTruthy();
      expect(d.field1.key && d.field1.label, d.id).toBeTruthy();
      expect(d.types.key && d.types.options?.length, d.id).toBeTruthy();
      expect(d.overall.key, d.id).toBe("stars");
      expect(d.criteria.length, d.id).toBeGreaterThan(0);
      for (const k of ["listLabel", "addTitle", "suggHint", "notYet", "emptyText", "namePlaceholder", "saveToast", "saveButton", "kommentarPlaceholder"]) {
        expect(d.texts[k], d.id + "." + k).toBeTruthy();
      }
    }
  });

  it("gruppeneigene Kategorien bleiben wie bisher", () => {
    const cfg = customConfig({ id: "pizza", name: "Pizzerien", icon: "🍕", field1Label: "Stadt", crit1Label: "Teig" });
    expect(cfg).toMatchObject({
      fbBase: "custom_pizza", fbSugg: "custom_pizza_sugg", label: "Pizzerien", icon: "🍕",
      field1Label: "Stadt", field1Placeholder: "z.B. Stadt", field1Key: "field1", genreOptions: null,
      crit1Label: "◆ Teig", crit1Short: "Teig", crit2Short: "Preis-Leistung", typeFilterLabel: "",
    });
  });
});
