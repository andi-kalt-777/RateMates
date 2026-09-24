import { describe, it, expect } from "vitest";
import { wishKey, wishUpdate, removeWishesUpdate, rankWishes } from "./wishes.js";

describe("wishKey", () => {
  it("fasst Schreibweisen zusammen", () => {
    expect(wishKey("  Bemerkenswerte   Orte ")).toBe("bemerkenswerte_orte");
    expect(wishKey("Pizzerien")).toBe(wishKey("pizzerien"));
  });
  it("entfernt in Firebase verbotene Zeichen", () => {
    expect(wishKey("a.b#c$d/e[f]")).toBe("abcdef");
    expect(wishKey("...")).toBe("unbenannt");
  });
  it("begrenzt die Länge auf 60", () => {
    expect(wishKey("x".repeat(80))).toHaveLength(60);
  });
});

describe("Updates", () => {
  it("Wunsch mit Anmerkung, Verweis im Profil", () => {
    expect(wishUpdate("Andi", "pizza", "  mit Teig ")).toEqual({
      "category_requests/pizza/users/Andi": "mit Teig",
      "users/Andi/wishes/pizza": true,
    });
  });
  it("ohne Anmerkung true", () => {
    expect(wishUpdate("Andi", "pizza", " ")["category_requests/pizza/users/Andi"]).toBe(true);
  });
  it("Konto löschen entfernt beide Seiten", () => {
    expect(removeWishesUpdate("Andi", ["a", "b"])).toEqual({
      "category_requests/a/users/Andi": null, "users/Andi/wishes/a": null,
      "category_requests/b/users/Andi": null, "users/Andi/wishes/b": null,
    });
  });
});

describe("rankWishes", () => {
  it("sortiert nach Stimmen, dann Name, und sammelt Anmerkungen", () => {
    const r = rankWishes({
      wein: { name: "Wein", users: { Jupp: true } },
      orte: { name: "Bemerkenswerte Orte", users: { Jupp: true, Andi: "Aussichtspunkte" } },
      leer: { name: "Leer", users: {} },
      alt: { users: { Gabi: true } },
    });
    expect(r.map((w) => [w.name, w.count])).toEqual([["Bemerkenswerte Orte", 2], ["alt", 1], ["Wein", 1]]);
    expect(r[0].people).toEqual(["Andi", "Jupp"]);
    expect(r[0].notes).toEqual(["Andi: Aussichtspunkte"]);
  });
  it("verträgt leere Daten", () => {
    expect(rankWishes(null)).toEqual([]);
  });
});
