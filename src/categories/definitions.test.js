import { describe, it, expect, vi } from "vitest";
import { before, kindOf, asOldConfig } from "./__fixtures__/alt.js";

vi.mock("../firebase.js", () => ({ firebase: {}, db: {}, auth: {} }));

const { DEFINITIONS, DEFINITION_BY_ID, CATEGORY_DEFS, CATEGORY_GROUPS } = await import("./index.js");

// Film und Serie hatten kein starsLabel; die Ansicht nahm dann "⭐ Gesamtwertung"
const effective = (cfg) => ({ ...cfg, starsLabel: cfg.starsLabel || "⭐ Gesamtwertung" });

describe("Definitionen ergeben denselben Stand wie vor dem Umbau", () => {
  it("CATEGORY_DEFS", () => {
    expect(CATEGORY_DEFS).toEqual(before.CATEGORY_DEFS);
  });

  it("CATEGORY_GROUPS mit Reihenfolge", () => {
    expect(CATEGORY_GROUPS).toEqual(before.CATEGORY_GROUPS);
  });

  it("Reihenfolge, Icons, Labels und Firebase-Pfade wie in der alten Registry", () => {
    const now = DEFINITIONS.map((d) => ({ id: d.id, icon: d.icon, label: d.label, base: d.paths.items, sugg: d.paths.suggestions, kind: kindOf(d.id) }));
    const old = before.ALL_CATS.map(({ cfgName, ...rest }) => rest);
    expect(now).toEqual(old);
  });

  it("jede Media-Kategorie trägt alle Texte und Felder der alten Konfiguration", () => {
    for (const c of before.ALL_CATS.filter((x) => x.cfgName)) {
      expect(effective(asOldConfig(DEFINITION_BY_ID[c.id])), c.id).toEqual(effective(before.configs[c.cfgName]));
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
      for (const k of ["listLabel", "addTitle", "addSuggTitle", "suggHint", "notYet", "emptyText", "namePlaceholder", "saveToast", "saveButton", "kommentarPlaceholder", "rateIcon"]) {
        expect(d.texts[k], d.id + "." + k).toBeTruthy();
      }
    }
  });
});
