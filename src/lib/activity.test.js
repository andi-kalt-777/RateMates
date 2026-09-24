import { describe, it, expect } from "vitest";
import { idTime, ratingTime, flattenRatings, dashboardStats, relativeTime } from "./activity.js";

const R = { id: "restaurant", label: "Restaurants" };
const W = { id: "whisky", label: "Whiskys" };
const B = { id: "beer", label: "Bier" };
const T0 = 1790000000000; // 2026-09-21

describe("Zeitpunkt einer Wertung", () => {
  it("nimmt ratedAt, wenn vorhanden", () => {
    expect(ratingTime({ id: "1", author: "Jupp" }, "Andi", { ratedAt: T0 })).toBe(T0);
  });
  it("ohne ratedAt: Anlagezeit, aber nur für die Wertung des Autors", () => {
    const item = { id: String(T0) + "sj01", author: "Andi" };
    expect(ratingTime(item, "Andi", {})).toBe(T0);
    expect(ratingTime(item, "Jupp", {})).toBeNull();
  });
  it("idTime erkennt nur echte Zeitstempel", () => {
    expect(idTime("1778360080756sj01")).toBe(1778360080756);
    expect(idTime("abc")).toBeNull();
    expect(idTime("42")).toBeNull();
  });
});

describe("dashboardStats", () => {
  const ratingEntries = [
    { def: R, item: { id: String(T0 - 5e8), author: "Andi", name: "Katze", ratings: { Andi: { stars: 8 }, Jupp: { stars: 9, ratedAt: T0 + 3000 } } } },
    { def: R, item: { id: "x1", author: "Jupp", name: "Aga", ratings: { Andi: { stars: 7, ratedAt: T0 + 1000 }, Maike: { stars: 6, ratedAt: T0 + 2000 } } } },
    { def: W, item: { id: "x2", author: "Jupp", name: "Ardbeg", ratings: { Andi: { stars: 9 }, Fremd: { stars: 2, ratedAt: T0 + 9000 } } } },
    { def: B, item: { id: "x3", author: "Maike", name: "Früh", ratings: { Maike: { stars: 5 } } } },
  ];
  const suggEntries = [
    { def: R, item: { author: "Jupp" } }, { def: R, item: { author: "Andi" } }, { def: B, item: { author: "Fremd" } },
  ];
  const s = dashboardStats({ ratingEntries, suggEntries, user: "Andi", friends: ["Andi", "Jupp", "Maike"] });

  it("zählt eigene Wertungen und Kategorien", () => {
    expect(s.ownCount).toBe(3);
    expect(s.categoryCount).toBe(2);
  });
  it("offene Vorschläge nur von dir und Freunden", () => {
    expect(s.openSuggestions).toBe(2);
  });
  it("letzte eigene Wertung: neueste mit bekanntem Zeitpunkt", () => {
    expect(s.lastOwn.item.name).toBe("Aga");
    expect(s.lastOwn.time).toBe(T0 + 1000);
  });
  it("Neues von Freunden: nur Freunde, nur mit Zeitpunkt, neueste zuerst", () => {
    expect(s.friendsLatest.map((r) => r.rater + ":" + r.item.name)).toEqual(["Jupp:Katze", "Maike:Aga"]);
  });
  it("meistbewertete Kategorien der eigenen Wertungen", () => {
    expect(s.topCategories.map((c) => c.def.id + "=" + c.n)).toEqual(["restaurant=2", "whisky=1"]);
  });
  it("ohne Daten: Nullen und leere Listen", () => {
    const e = dashboardStats({ ratingEntries: [], suggEntries: [], user: "Andi", friends: [] });
    expect(e).toEqual({ ownCount: 0, categoryCount: 0, openSuggestions: 0, lastOwn: null, friendsLatest: [], topCategories: [] });
  });
  it("flattenRatings liefert jede Einzelwertung", () => {
    expect(flattenRatings(ratingEntries)).toHaveLength(7);
  });
});

describe("relativeTime", () => {
  const now = new Date(2026, 8, 24, 12, 0).getTime();
  const ago = (d, h = 0) => new Date(2026, 8, 24 - d, 12 - h).getTime();
  it("heute, gestern, Tage, Wochen, Datum", () => {
    expect(relativeTime(ago(0, 3), now)).toBe("heute");
    expect(relativeTime(ago(1), now)).toBe("gestern");
    expect(relativeTime(ago(3), now)).toBe("vor 3 Tagen");
    expect(relativeTime(ago(9), now)).toBe("letzte Woche");
    expect(relativeTime(ago(20), now)).toBe("vor 2 Wochen");
    expect(relativeTime(ago(60), now)).toBe("am " + new Date(ago(60)).toLocaleDateString("de-DE"));
  });
});
