import { describe, it, expect, vi } from "vitest";

vi.mock("../firebase.js", () => ({ firebase: {}, db: {}, auth: {} }));

const { DEFINITIONS, CATEGORY_DEFS, CATEGORY_GROUPS, defaultCategories } = await import("./index.js");

describe("Kategorie-Registry", () => {
  const ids = DEFINITIONS.map((d) => d.id);

  it("jede Kategorie steckt in genau einer Obergruppe", () => {
    for (const id of ids) {
      expect(CATEGORY_GROUPS.filter((g) => g.cats.includes(id)), id).toHaveLength(1);
    }
  });

  it("IDs sind eindeutig und CATEGORY_DEFS enthält alle", () => {
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.keys(CATEGORY_DEFS).sort()).toEqual([...ids].sort());
  });

  it("jeder Firebase-Pfad gehört genau einer Kategorie", () => {
    const paths = DEFINITIONS.flatMap((d) => [d.paths.items, d.paths.suggestions]);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe("defaultCategories", () => {
  it("enthält alle Kategorien, nur Restaurants ist vorausgewählt", () => {
    const d = defaultCategories();
    expect(Object.keys(d).sort()).toEqual(DEFINITIONS.map((x) => x.id).sort());
    expect(Object.entries(d).filter(([, v]) => v).map(([k]) => k)).toEqual(["restaurant"]);
  });
});
