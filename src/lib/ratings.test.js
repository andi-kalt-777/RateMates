import { describe, it, expect, vi } from "vitest";

// Ohne echte Firebase-Verbindung: stamped() braucht nur den Serverzeit-Platzhalter
vi.mock("../firebase.js", () => ({
  firebase: { database: { ServerValue: { TIMESTAMP: { ".sv": "timestamp" } } } },
  db: {},
  auth: {},
}));

const { stamped, normalizeRest, dupKey, restrictToMembers } =
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
