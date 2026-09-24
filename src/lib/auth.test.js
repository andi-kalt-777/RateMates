import { describe, it, expect, vi } from "vitest";

vi.mock("../firebase.js", () => ({ firebase: {}, db: {}, auth: {} }));

const { hashPw, validUsername, authEmail, nameKey, hasRealEmail, validEmail, authErrorMsg } =
  await import("./auth.js");

describe("hashPw", () => {
  // Muss mit den gespeicherten pwHash-Werten alter Konten übereinstimmen; die Datenbankregel
  // prüft beim Umzug genau diesen Hash. Referenzwert mit Node-crypto berechnet.
  it("ist sha256 über 'name klein:passwort'", async () => {
    expect(await hashPw("Andi", "geheim123")).toBe("c8ad964c60f500fd7f84f729410b1a97c608cf463a20793dd1d068a9a7ceec72");
  });
});

describe("authEmail und nameKey", () => {
  it("bildet Benutzernamen auf technische Adressen ab", () => {
    expect(authEmail("Gabi kalthoefer")).toBe("gabi.kalthoefer@ratemates.invalid");
    expect(authEmail("  Jupp ")).toBe("jupp@ratemates.invalid");
  });
  it("nameKey ist klein und ohne Randleerzeichen", () => {
    expect(nameKey(" Gabi Kalthoefer ")).toBe("gabi kalthoefer");
  });
});

describe("hasRealEmail", () => {
  it("erkennt echte Adressen, nicht die technischen", () => {
    expect(hasRealEmail({ email: "a@b.de" })).toBe(true);
    expect(hasRealEmail({ email: "jupp@ratemates.invalid" })).toBe(false);
    expect(hasRealEmail(null)).toBe(false);
    expect(hasRealEmail({})).toBe(false);
  });
});

describe("Eingabeprüfung", () => {
  it("validUsername: 2–20 Zeichen, Buchstaben, Ziffern, Leerzeichen, _ und -", () => {
    expect(validUsername("Gabi kalthoefer")).toBe(true);
    expect(validUsername("a-b_c")).toBe(true);
    expect(validUsername("A")).toBe(false);
    expect(validUsername("x".repeat(21))).toBe(false);
    expect(validUsername("Jörg")).toBe(false);
    expect(validUsername("a.b")).toBe(false);
  });
  it("validEmail", () => {
    expect(validEmail("a@b.de")).toBe(true);
    expect(validEmail("a@b")).toBe(false);
    expect(validEmail("a b@c.de")).toBe(false);
  });
});

describe("authErrorMsg", () => {
  it("übersetzt bekannte Firebase-Fehler", () => {
    expect(authErrorMsg({ code: "auth/too-many-requests" }, "x")).toBe("Zu viele Versuche. Bitte kurz warten.");
    expect(authErrorMsg({ code: "auth/weak-password" }, "x")).toMatch(/mindestens 6/);
  });
  it("nimmt sonst den Ersatztext", () => {
    expect(authErrorMsg({ code: "auth/unbekannt" }, "Ersatz")).toBe("Ersatz");
    expect(authErrorMsg(null, "Ersatz")).toBe("Ersatz");
  });
});
