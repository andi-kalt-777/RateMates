import { describe, it, expect, vi } from "vitest";

// Ohne echte Firebase-Verbindung: stamped() braucht nur den Serverzeit-Platzhalter
vi.mock("../firebase.js", () => ({
  firebase: { database: { ServerValue: { TIMESTAMP: { ".sv": "timestamp" } } } },
  db: {},
  auth: {},
}));

const { stamped, normalizeRest, dupKey, restrictToMembers, getAvgRest, getAvgWhisky, getAvgMedia } =
  await import("./ratings.js");

describe("stamped", () => {
  it("ergänzt ratedAt als Serverzeit und lässt die Wertung sonst gleich", () => {
    const r = { stars: 8, kommentar: "gut" };
    expect(stamped(r)).toEqual({ stars: 8, kommentar: "gut", ratedAt: { ".sv": "timestamp" } });
    expect(r).not.toHaveProperty("ratedAt");
  });
});

describe("normalizeRest (altes Restaurant-Format)", () => {
  it("macht aus Wertungsfeldern am Eintrag die Wertung des Autors", () => {
    const r = normalizeRest({ id: "1", name: "Katze", author: "Jupp", food: 8, service: 7, price: 2, stars: 9 });
    expect(r.ratings).toEqual({ Jupp: { food: 8, service: 7, price: 2, stars: 9 } });
  });

  it("füllt fehlende Altwerte mit den bisherigen Standardwerten", () => {
    const r = normalizeRest({ author: "Jupp", food: 6 });
    expect(r.ratings.Jupp).toEqual({ food: 6, service: 5, price: 3, stars: 7 });
  });

  it("ergänzt die Autorwertung neben neueren Wertungen anderer", () => {
    const r = normalizeRest({ author: "Jupp", food: 8, service: 7, price: 2, stars: 9, ratings: { Andi: { food: 5, service: 5, price: 1, stars: 6 } } });
    expect(Object.keys(r.ratings).sort()).toEqual(["Andi", "Jupp"]);
    expect(r.ratings.Andi.stars).toBe(6);
    expect(r.ratings.Jupp.stars).toBe(9);
  });

  it("überschreibt eine vorhandene Autorwertung nicht mit Altwerten", () => {
    const item = { author: "Jupp", food: 1, ratings: { Jupp: { food: 9, service: 9, price: 2, stars: 9 } } };
    expect(normalizeRest(item)).toBe(item);
  });

  it("lässt Einträge im neuen Format unverändert", () => {
    const item = { author: "Andi", ratings: { Andi: { food: 7, service: 7, price: 2, stars: 7 } } };
    expect(normalizeRest(item)).toBe(item);
  });

  it("gibt Einträgen ohne Autor und ohne Wertungen eine leere Wertungsliste", () => {
    expect(normalizeRest({ name: "X" }).ratings).toEqual({});
  });
});

describe("dupKey", () => {
  it("ignoriert Groß-/Kleinschreibung und Leerzeichen am Rand", () => {
    expect(dupKey("  Katze ", "Köln ")).toBe(dupKey("katze", "KÖLN"));
  });
  it("unterscheidet gleiche Namen in verschiedenen Städten", () => {
    expect(dupKey("Katze", "Köln")).not.toBe(dupKey("Katze", "Bonn"));
  });
  it("verträgt fehlende Werte", () => {
    expect(dupKey(undefined, null)).toBe("|");
  });
});

describe("restrictToMembers", () => {
  const item = { name: "X", ratings: { Andi: { stars: 8 }, Jupp: { stars: 6 }, Fremd: { stars: 1 } } };
  it("behält nur Wertungen von Gruppenmitgliedern", () => {
    expect(Object.keys(restrictToMembers(item, ["Andi", "Jupp"]).ratings)).toEqual(["Andi", "Jupp"]);
  });
  it("verändert den Eintrag selbst nicht", () => {
    restrictToMembers(item, ["Andi"]);
    expect(Object.keys(item.ratings)).toHaveLength(3);
  });
  it("verträgt Einträge ohne Wertungen", () => {
    expect(restrictToMembers({ name: "Y" }, ["Andi"]).ratings).toEqual({});
  });
});

describe("Durchschnitte", () => {
  it("Restaurant: Mittelwerte auf eine Stelle, Preis ganzzahlig, avg aus Essen und Service", () => {
    const a = getAvgRest({ ratings: {
      A: { food: 8, service: 6, price: 2, stars: 7 },
      B: { food: 9, service: 7, price: 3, stars: 8 },
      C: { food: 7, service: 9, price: 3, stars: 10 },
    } });
    expect(a).toEqual({ food: 8, service: 7.3, price: 3, stars: 8.3, avg: 7.7, count: 3 });
  });

  it("Restaurant ohne Wertungen: alles 0", () => {
    expect(getAvgRest({})).toEqual({ food: 0, service: 0, price: 0, stars: 0, avg: 0, count: 0 });
  });

  it("Whisky", () => {
    expect(getAvgWhisky({ ratings: { A: { stars: 9, rauchigkeit: 8, fruchtigkeit: 3 }, B: { stars: 6, rauchigkeit: 2, fruchtigkeit: 6 } } }))
      .toEqual({ stars: 7.5, rauchigkeit: 5, fruchtigkeit: 4.5, count: 2 });
    expect(getAvgWhisky({ ratings: {} }).count).toBe(0);
  });

  it("Media (Filme, Bier, …) mit den Kriterien handlung und spannung", () => {
    expect(getAvgMedia({ ratings: { A: { stars: 7, handlung: 5, spannung: 2 }, B: { stars: 8, handlung: 6, spannung: 4 }, C: { stars: 8, handlung: 6, spannung: 4 } } }))
      .toEqual({ stars: 7.7, handlung: 5.7, spannung: 3.3, count: 3 });
  });

  it("ratedAt stört die Durchschnitte nicht", () => {
    expect(getAvgMedia({ ratings: { A: { stars: 7, handlung: 5, spannung: 2, ratedAt: 1790000000000 } } }).stars).toBe(7);
  });
});
