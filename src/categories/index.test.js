import { describe, it, expect, vi } from "vitest";

vi.mock("../firebase.js", () => ({ firebase: {}, db: {}, auth: {} }));

const {
  CATEGORY_DEFS, CATEGORY_GROUPS, ALL_CATS,
  avgOfCat, subtitleOfCat, catFilterMeta, customConfig, modesForGroup,
} = await import("./index.js");

const byId = Object.fromEntries(ALL_CATS.map((c) => [c.id, c]));

describe("Kategorie-Registry", () => {
  const ids = Object.keys(CATEGORY_DEFS);

  it("jede Kategorie steckt in genau einer Obergruppe", () => {
    for (const id of ids) {
      expect(CATEGORY_GROUPS.filter((g) => g.cats.includes(id)), id).toHaveLength(1);
    }
  });

  it("ALL_CATS enthält genau die definierten Kategorien, mit gleichem Icon und Label", () => {
    expect(ALL_CATS.map((c) => c.id).sort()).toEqual([...ids].sort());
    for (const c of ALL_CATS) {
      expect(c.icon, c.id).toBe(CATEGORY_DEFS[c.id].icon);
      expect(c.label, c.id).toBe(CATEGORY_DEFS[c.id].label);
    }
  });

  it("jeder Firebase-Pfad gehört genau einer Kategorie", () => {
    const paths = ALL_CATS.flatMap((c) => [c.base, c.sugg]);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("Media-Kategorien: Pfade in ALL_CATS und in der Konfiguration stimmen überein", () => {
    for (const c of ALL_CATS.filter((x) => x.kind === "media")) {
      expect(c.cfg, c.id).toBeTruthy();
      expect(c.cfg.fbBase, c.id).toBe(c.base);
      expect(c.cfg.fbSugg, c.id).toBe(c.sugg);
    }
  });
});

describe("avgOfCat", () => {
  it("rechnet je nach Art mit den passenden Kriterien", () => {
    expect(avgOfCat(byId.restaurant, { ratings: { A: { food: 8, service: 6, price: 2, stars: 7 } } }).avg).toBe(7);
    expect(avgOfCat(byId.whisky, { ratings: { A: { stars: 9, rauchigkeit: 8, fruchtigkeit: 2 } } }).rauchigkeit).toBe(8);
    expect(avgOfCat(byId.film, { ratings: { A: { stars: 6, handlung: 4, spannung: 3 } } }).handlung).toBe(4);
  });
});

describe("subtitleOfCat", () => {
  it("Restaurant: Stadt · Küchen", () => {
    expect(subtitleOfCat(byId.restaurant, { city: "Köln", cuisines: ["Italienisch", "Pizza"] })).toBe("Köln · Italienisch & Pizza");
  });
  it("Whisky: Destillerie · Sorten", () => {
    expect(subtitleOfCat(byId.whisky, { distillery: "Lagavulin", types: ["Islay"] })).toBe("Lagavulin · Islay");
  });
  it("Media: field1 · Genres, leere Teile fallen weg", () => {
    expect(subtitleOfCat(byId.film, { field1: "Netflix", genres: [] })).toBe("Netflix");
    expect(subtitleOfCat(byId.film, {})).toBe("");
  });
});

describe("catFilterMeta", () => {
  it("liefert die Filterwerte je Art", () => {
    const r = catFilterMeta(byId.restaurant);
    expect(r.g1({ city: " Köln " })).toBe("Köln");
    expect(r.g2({ cuisines: ["Thai"] })).toEqual(["Thai"]);
    expect(catFilterMeta(byId.whisky).g1({ distillery: "Ardbeg" })).toBe("Ardbeg");
    expect(catFilterMeta(byId.beer).g2({})).toEqual([]);
  });
});

describe("customConfig (gruppeneigene Kategorien)", () => {
  it("legt die Daten unter custom_<id> und custom_<id>_sugg ab", () => {
    const cfg = customConfig({ id: "pizza", name: "Pizzerien", icon: "🍕" });
    expect(cfg.fbBase).toBe("custom_pizza");
    expect(cfg.fbSugg).toBe("custom_pizza_sugg");
    expect(cfg.label).toBe("Pizzerien");
  });
  it("hat Standardwerte für fehlende Angaben", () => {
    const cfg = customConfig({ id: "x", name: "X" });
    expect(cfg.icon).toBe("⭐");
    expect(cfg.crit1Short).toBe("Qualität");
    expect(cfg.crit2Short).toBe("Preis-Leistung");
  });
});

describe("modesForGroup", () => {
  it("ordnet Standard-Kategorien nach Obergruppen und hängt eigene hinten an", () => {
    const group = {
      categories: { whisky: true, restaurant: true, film: true },
      custom: { a: { id: "pizza", name: "Pizzerien", icon: "🍕" } },
    };
    expect(modesForGroup(group).map((m) => m[0])).toEqual(["restaurant", "film", "whisky", "c:pizza"]);
  });
  it("verträgt Gruppen ohne Kategorien", () => {
    expect(modesForGroup({})).toEqual([]);
  });
});
