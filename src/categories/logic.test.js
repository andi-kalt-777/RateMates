import { describe, it, expect, vi } from "vitest";
import { kindOf, oldConfig, avgOfCat, subtitleOfCat, catFilterMeta } from "./__fixtures__/alt.js";

vi.mock("../firebase.js", () => ({
  firebase: { database: { ServerValue: { TIMESTAMP: { ".sv": "timestamp" } } } },
  db: {},
  auth: {},
}));

const { DEFINITIONS, DEFINITION_BY_ID, customDefinition } = await import("./index.js");
const L = await import("./logic.js");
const { stamped, dupKey, normalizeRest } = await import("../lib/ratings.js");

const TS = { ".sv": "timestamp" };
const kind = kindOf;

// ── Nachbau der bisherigen Speicherlogik aus RestaurantApp, WhiskyApp und MediaApp ──
// (so stand es vor dem Umbau im Code; die neue Logik muss exakt dasselbe schreiben)
function oldPayloads(id, form, user, cfg) {
  const k = kind(id);
  if (k === "rest") return {
    item: { id: "1", name: form.name, city: form.city.trim(), cuisines: form.cuisines, author: user,
      ratings: { [user]: stamped({ food: form.food, service: form.service, price: form.price, stars: form.stars, kommentar: form.kommentar }) } },
    sugg: { id: "1", name: form.name, city: form.city.trim(), cuisines: form.cuisines, author: user },
    update: { name: form.name, city: form.city.trim(), cuisines: form.cuisines },
    rating: stamped({ food: form.food, service: form.service, price: form.price, stars: form.stars, kommentar: form.kommentar }),
  };
  if (k === "whisky") return {
    item: { id: "1", name: form.name, distillery: form.distillery.trim(), types: form.types, author: user,
      ratings: { [user]: stamped({ stars: form.stars, rauchigkeit: form.rauchigkeit, fruchtigkeit: form.fruchtigkeit, kommentar: form.kommentar }) } },
    sugg: { id: "1", name: form.name, distillery: form.distillery.trim(), types: form.types, author: user },
    update: { name: form.name, distillery: form.distillery.trim(), types: form.types },
    rating: stamped({ stars: form.stars, rauchigkeit: form.rauchigkeit, fruchtigkeit: form.fruchtigkeit, kommentar: form.kommentar }),
  };
  const fk = cfg.field1Key;
  return {
    item: { id: "1", name: form.name, [fk]: form.field1.trim(), field1: form.field1.trim(), genres: form.genres, author: user,
      ratings: { [user]: stamped({ stars: form.stars, handlung: form.handlung, spannung: form.spannung, kommentar: form.kommentar }) } },
    sugg: { id: "1", name: form.name, [fk]: form.field1.trim(), field1: form.field1.trim(), genres: form.genres, author: user },
    update: { name: form.name, [fk]: form.field1.trim(), field1: form.field1.trim(), genres: form.genres },
    rating: stamped({ stars: form.stars, handlung: form.handlung, spannung: form.spannung, kommentar: form.kommentar }),
  };
}
// Altes Formular (eigene Feldnamen je Ansicht) aus einem einheitlichen Formular
function oldForm(id, f) {
  const k = kind(id);
  if (k === "rest") return { name: f.name, city: f.field1, cuisines: f.types, food: f.food, service: f.service, price: f.price, stars: f.stars, kommentar: f.kommentar };
  if (k === "whisky") return { name: f.name, distillery: f.field1, types: f.types, stars: f.stars, rauchigkeit: f.rauchigkeit, fruchtigkeit: f.fruchtigkeit, kommentar: f.kommentar };
  return { name: f.name, field1: f.field1, genres: f.types, stars: f.stars, handlung: f.handlung, spannung: f.spannung, kommentar: f.kommentar };
}
const sampleForm = (def) => ({ ...L.emptyForm(def), name: "Probe", field1: "  Köln ", types: [def.types.options?.[0]].filter(Boolean), kommentar: "gut" });

describe("Speichern: jede Kategorie schreibt dieselben Daten wie vorher", () => {
  for (const def of DEFINITIONS) {
    it(def.id, () => {
      const form = sampleForm(def);
      const old = oldPayloads(def.id, oldForm(def.id, form), "Andi", oldConfig(def.id));
      expect(L.itemPayload(def, { id: "1", form, user: "Andi", withRating: true })).toEqual(old.item);
      expect(L.itemPayload(def, { id: "1", form, user: "Andi", withRating: false })).toEqual(old.sugg);
      expect(L.updatePayload(def, form)).toEqual(old.update);
      expect(L.ratingPayload(def, form)).toEqual(old.rating);
      expect(L.ratingPayload(def, form).ratedAt).toEqual(TS);
    });
  }
});

describe("Startwerte wie in den bisherigen Formularen", () => {
  it("Restaurant, Whisky, Media", () => {
    expect(L.emptyRating(DEFINITION_BY_ID.restaurant)).toEqual({ service: 5, food: 5, price: 3, stars: 7, kommentar: "" });
    expect(L.emptyRating(DEFINITION_BY_ID.whisky)).toEqual({ stars: 7, rauchigkeit: 5, fruchtigkeit: 5, kommentar: "" });
    for (const def of DEFINITIONS.filter((d) => kind(d.id) === "media")) {
      expect(L.emptyRating(def), def.id).toEqual({ stars: 7, handlung: 5, spannung: 5, kommentar: "" });
    }
  });
});

describe("Durchschnitte wie bisher", () => {
  const ratings = (def) => ({
    A: { ...L.emptyRating(def), stars: 7, [def.criteria[0].key]: 8, [def.criteria[1].key]: 6 },
    B: { ...L.emptyRating(def), stars: 9, [def.criteria[0].key]: 9, [def.criteria[1].key]: 7, ...(def.criteria[2] ? { price: 3 } : {}) },
    C: { ...L.emptyRating(def), stars: 10, [def.criteria[0].key]: 7, [def.criteria[1].key]: 9, ...(def.criteria[2] ? { price: 2 } : {}) },
  });
  for (const def of DEFINITIONS) {
    it(def.id, () => {
      const item = { ratings: ratings(def) };
      expect(L.average(def, item)).toEqual(avgOfCat(def.id, item));
      expect(L.average(def, {})).toEqual(avgOfCat(def.id, {}));
    });
  }
  it("Hauptwert: Restaurant = Schnitt aus Essen und Service, sonst Sterne", () => {
    const r = DEFINITION_BY_ID.restaurant, w = DEFINITION_BY_ID.whisky;
    expect(L.score(r, { avg: 7.5, stars: 9 })).toBe(7.5);
    expect(L.score(w, { avg: 7.5, stars: 9 })).toBe(9);
  });
});

describe("Lesen: Feld 1, Auswahl, Untertitel, Filter, Duplikate", () => {
  const items = {
    restaurant: [{ name: "Katze", city: "Köln", cuisines: ["Thai"] }, { name: "Alt", city: "Bonn", cuisine: "Deutsch" }],
    whisky: [{ name: "Ardbeg 10", distillery: "Ardbeg", types: ["Islay"] }],
    film: [{ name: "Dune", director: "Kino", field1: "Kino", genres: ["Drama"] }, { name: "Alt", director: "Netflix" }],
    serie: [{ name: "Dark", platform: "Netflix", field1: "Netflix", genres: [] }],
    beer: [{ name: "Früh", field1: "Köln", genres: ["Kölsch"] }, { name: "Leer" }],
  };
  it("Untertitel wie in der globalen Übersicht", () => {
    for (const [id, list] of Object.entries(items)) {
      for (const it of list) {
        // Ausnahme bisher: global zeigte bei Serien nur field1/director, nicht platform — gleich, solange field1 gesetzt ist
        expect(L.subtitle(DEFINITION_BY_ID[id], it), id + " " + it.name).toBe(
          it.cuisine ? "Bonn · Deutsch" : subtitleOfCat(id, it));
      }
    }
  });
  it("Filterwerte wie bisher (außer Whisky: Beschriftung jetzt „Alle Typen“ wie in der Gruppe)", () => {
    for (const [id, list] of Object.entries(items)) {
      const oldM = catFilterMeta(id), newM = L.filterMeta(DEFINITION_BY_ID[id]);
      expect(newM.l1, id).toBe(oldM.l1);
      if (id !== "whisky") expect(newM.l2, id).toBe(oldM.l2);
      for (const it of list.filter((x) => !x.cuisine && (x.field1 !== undefined || id === "restaurant" || id === "whisky"))) {
        expect(newM.g1(it), id).toBe(oldM.g1(it));
        expect(newM.g2(it), id).toEqual(oldM.g2(it));
      }
    }
    expect(L.filterMeta(DEFINITION_BY_ID.whisky).l2).toBe("Alle Typen");
  });
  it("Feld 1 greift bei Film auf den Altnamen director zurück", () => {
    expect(L.field1Of(DEFINITION_BY_ID.film, { director: "Netflix" })).toBe("Netflix");
  });
  it("alte Restaurants mit einzelner cuisine", () => {
    expect(L.typesOf(DEFINITION_BY_ID.restaurant, { cuisine: "Deutsch" })).toEqual(["Deutsch"]);
  });
  it("Duplikatschlüssel aus Name und Feld 1", () => {
    expect(L.itemDupKey(DEFINITION_BY_ID.restaurant, { name: "Katze ", city: "KÖLN" })).toBe(dupKey("katze", "köln"));
    expect(L.itemDupKey(DEFINITION_BY_ID.film, { name: "Dune", director: "Kino" })).toBe(dupKey("Dune", "Kino"));
  });
  it("normalizeItem nur bei Restaurants", () => {
    const legacy = { author: "Jupp", food: 8 };
    expect(L.normalizeItem(DEFINITION_BY_ID.restaurant, legacy)).toEqual(normalizeRest(legacy));
    expect(L.normalizeItem(DEFINITION_BY_ID.beer, legacy)).toBe(legacy);
  });
});

describe("Formulare", () => {
  it("Pflichtfelder wie bisher", () => {
    const r = DEFINITION_BY_ID.restaurant, b = DEFINITION_BY_ID.beer, c = customDefinition({ id: "x", name: "X" });
    expect(L.validate(r, L.emptyForm(r))).toEqual({ name: "Bitte Name eingeben", field1: "Bitte Stadt eingeben", types: "Bitte Küche auswählen" });
    expect(L.validate(DEFINITION_BY_ID.whisky, L.emptyForm(DEFINITION_BY_ID.whisky))).toEqual({ name: "Bitte Name eingeben", field1: "Bitte Destillerie eingeben", types: "Bitte Typ auswählen" });
    expect(L.validate(b, L.emptyForm(b))).toEqual({ name: "Bitte Name eingeben", types: "Bitte Genre auswählen" });
    expect(L.validate(c, { ...L.emptyForm(c), name: "A" })).toEqual({});
  });
  it("Bearbeiten übernimmt Stammdaten und eigene Wertung", () => {
    const def = DEFINITION_BY_ID.restaurant;
    const item = { name: "Katze", city: "Köln", cuisines: ["Thai"], ratings: { Andi: { food: 9, service: 8, price: 2, stars: 9 } } };
    expect(L.formFromItem(def, item, "Andi")).toEqual({ name: "Katze", field1: "Köln", types: ["Thai"], stars: 9, food: 9, service: 8, price: 2, kommentar: "" });
  });
  it("Vorschlag übernehmen: Stammdaten plus Startwerte", () => {
    const def = DEFINITION_BY_ID.film;
    expect(L.formFromSuggestion(def, { name: "Dune", director: "Kino", genres: ["Drama"] }))
      .toEqual({ name: "Dune", field1: "Kino", types: ["Drama"], stars: 7, handlung: 5, spannung: 5, kommentar: "" });
  });
});

describe("Durchschnitte mit festen Zahlen", () => {
  it("Restaurant: Mittelwerte auf eine Stelle, Preis ganzzahlig, avg aus Essen und Service", () => {
    const a = L.average(DEFINITION_BY_ID.restaurant, { ratings: {
      A: { food: 8, service: 6, price: 2, stars: 7 },
      B: { food: 9, service: 7, price: 3, stars: 8 },
      C: { food: 7, service: 9, price: 3, stars: 10 },
    } });
    expect(a).toEqual({ food: 8, service: 7.3, price: 3, stars: 8.3, avg: 7.7, count: 3 });
  });

  it("Restaurant ohne Wertungen: alles 0", () => {
    expect(L.average(DEFINITION_BY_ID.restaurant, {})).toEqual({ food: 0, service: 0, price: 0, stars: 0, avg: 0, count: 0 });
  });

  it("Whisky", () => {
    expect(L.average(DEFINITION_BY_ID.whisky, { ratings: { A: { stars: 9, rauchigkeit: 8, fruchtigkeit: 3 }, B: { stars: 6, rauchigkeit: 2, fruchtigkeit: 6 } } }))
      .toEqual({ stars: 7.5, rauchigkeit: 5, fruchtigkeit: 4.5, count: 2 });
    expect(L.average(DEFINITION_BY_ID.whisky, { ratings: {} }).count).toBe(0);
  });

  it("Media (Filme, Bier, …) mit den Kriterien handlung und spannung", () => {
    expect(L.average(DEFINITION_BY_ID.film, { ratings: { A: { stars: 7, handlung: 5, spannung: 2 }, B: { stars: 8, handlung: 6, spannung: 4 }, C: { stars: 8, handlung: 6, spannung: 4 } } }))
      .toEqual({ stars: 7.7, handlung: 5.7, spannung: 3.3, count: 3 });
  });

  it("ratedAt stört die Durchschnitte nicht", () => {
    expect(L.average(DEFINITION_BY_ID.film, { ratings: { A: { stars: 7, handlung: 5, spannung: 2, ratedAt: 1790000000000 } } }).stars).toBe(7);
  });
});

describe("Stadtfilter", () => {
  const R = DEFINITION_BY_ID.restaurant, C = DEFINITION_BY_ID.cafe, F = DEFINITION_BY_ID.film, W = DEFINITION_BY_ID.whisky;
  it("Orts-Kategorien: Restaurants, Cafés, Bars, Eisdielen, Lieferservices", () => {
    expect(DEFINITIONS.filter((d) => d.field1.place).map((d) => d.id)).toEqual(["restaurant", "cafe", "bar", "icecream", "delivery"]);
  });
  it("Stadt ist der Teil vor dem ersten Komma", () => {
    expect(L.cityOf(R, { city: " Köln " })).toBe("Köln");
    expect(L.cityOf(C, { field1: "Köln, Altstadt" })).toBe("Köln");
    expect(L.cityOf(C, { field1: "" })).toBeNull();
  });
  it("andere Kategorien haben keine Stadt", () => {
    expect(L.cityOf(F, { field1: "Netflix" })).toBeNull();
    expect(L.cityOf(W, { distillery: "Islay, Schottland" })).toBeNull();
  });
  it("Auswahl fasst Schreibweisen zusammen und nimmt die häufigste", () => {
    const entries = [
      { cat: R, item: { city: "Köln" } }, { cat: R, item: { city: "köln" } }, { cat: C, item: { field1: "Köln, Südstadt" } },
      { cat: R, item: { city: "Aachen" } }, { cat: F, item: { field1: "Netflix" } }, { cat: R, item: { city: "" } },
    ];
    expect(L.cityOptions(entries)).toEqual(["Aachen", "Köln"]);
    expect(L.cityKey(" KÖLN ")).toBe("köln");
  });
});