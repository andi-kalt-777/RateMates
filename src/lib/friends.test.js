import { describe, it, expect } from "vitest";
import {
  INVITE_MS, newInviteCode, isInviteCode, inviteStatus,
  friendshipUpdate, sendRequestUpdate, cancelRequestUpdate, declineRequestUpdate,
  acceptRequestUpdate, acceptInviteUpdate, removeFriendUpdate,
  namesOf, activeDefinitions, migrationFromGroups,
} from "./friends.js";

describe("Einladungscode", () => {
  it("hat 20 Zeichen aus dem erlaubten Alphabet", () => {
    const c = newInviteCode();
    expect(c).toHaveLength(20);
    expect(isInviteCode(c)).toBe(true);
    expect(newInviteCode()).not.toBe(c);
  });
  it("bildet Bytes gleichmäßig ab", () => {
    expect(newInviteCode(new Uint8Array(20).fill(0))).toBe("a".repeat(20));
    expect(newInviteCode(new Uint8Array(20).fill(31))).toBe("9".repeat(20));
  });
  it("lehnt fremde Formate ab", () => {
    expect(isInviteCode("1727170000000")).toBe(false);
    expect(isInviteCode("a".repeat(19))).toBe(false);
    expect(isInviteCode("A".repeat(20))).toBe(false);
    expect(isInviteCode(null)).toBe(false);
  });
});

describe("inviteStatus", () => {
  const now = 1_800_000_000_000;
  const inv = { from: "Gabi", createdAt: now - 1000 };
  it("gültig", () => expect(inviteStatus(inv, "Andi", [], now)).toBe("ok"));
  it("unbekannt oder gelöscht", () => {
    expect(inviteStatus(null, "Andi", [], now)).toBe("invalid");
    expect(inviteStatus({}, "Andi", [], now)).toBe("invalid");
  });
  it("eigener Link", () => expect(inviteStatus(inv, "Gabi", [], now)).toBe("own"));
  it("schon befreundet", () => expect(inviteStatus(inv, "Andi", ["Gabi"], now)).toBe("already"));
  it("abgelaufen nach 14 Tagen", () => {
    expect(inviteStatus({ from: "Gabi", createdAt: now - INVITE_MS }, "Andi", [], now)).toBe("ok");
    expect(inviteStatus({ from: "Gabi", createdAt: now - INVITE_MS - 1 }, "Andi", [], now)).toBe("expired");
  });
});

describe("Updates", () => {
  it("Freundschaft steht auf beiden Seiten", () => {
    expect(friendshipUpdate("A", "B", "request", 5)).toEqual({
      "friends/A/B": { since: 5, via: "request" },
      "friends/B/A": { since: 5, via: "request" },
    });
  });
  it("Anfrage mit Spiegel unter friend_requests_sent", () => {
    expect(sendRequestUpdate("A", "B", 7)).toEqual({ "friend_requests/B/A": 7, "friend_requests_sent/A/B": 7 });
    expect(cancelRequestUpdate("A", "B")).toEqual({ "friend_requests/B/A": null, "friend_requests_sent/A/B": null });
  });
  it("Ablehnen löscht die Anfrage des anderen", () => {
    expect(declineRequestUpdate("B", "A")).toEqual({ "friend_requests/B/A": null, "friend_requests_sent/A/B": null });
  });
  it("Annehmen: Freundschaft plus Anfrage weg", () => {
    expect(acceptRequestUpdate("B", "A", 9)).toEqual({
      "friends/B/A": { since: 9, via: "request" },
      "friends/A/B": { since: 9, via: "request" },
      "friend_requests/B/A": null,
      "friend_requests_sent/A/B": null,
    });
  });
  it("Einladung: Code als Herkunft, Einladung wird verbraucht", () => {
    expect(acceptInviteUpdate("Neu", "code", "Andi", 3)).toEqual({
      "friends/Neu/Andi": { since: 3, via: "code" },
      "friends/Andi/Neu": { since: 3, via: "code" },
      "invites/code": null,
    });
  });
  it("Entfernen auf beiden Seiten", () => {
    expect(removeFriendUpdate("A", "B")).toEqual({ "friends/A/B": null, "friends/B/A": null });
  });
});

describe("Hilfen", () => {
  it("namesOf sortiert deutsch", () => {
    expect(namesOf({ Zoe: 1, Ärne: 1, Bert: 1 })).toEqual(["Ärne", "Bert", "Zoe"]);
    expect(namesOf(null)).toEqual([]);
  });
  it("activeDefinitions in Definitions-Reihenfolge", () => {
    expect(activeDefinitions({ whisky: true, restaurant: true, film: false }).map((d) => d.id)).toEqual(["restaurant", "whisky"]);
    expect(activeDefinitions(null)).toEqual([]);
  });
});

describe("migrationFromGroups", () => {
  const groups = {
    g1: { members: { Andi: "admin", Gabi: "member" }, categories: { restaurant: true, whisky: true } },
    g2: { members: { Andi: "admin", Tom: "member", Weg: "member" }, categories: { film: true, gibtsnicht: true, cafe: false } },
    g3: { members: { Solo: "admin" }, categories: { beer: true } },
  };
  const upd = migrationFromGroups(groups, ["Andi", "Gabi", "Tom", "Solo"], 1);
  const friends = Object.keys(upd).filter((k) => k.startsWith("friends/")).sort();
  it("befreundet alle, die eine Gruppe teilen, beidseitig", () => {
    expect(friends).toEqual([
      "friends/Andi/Gabi", "friends/Andi/Tom", "friends/Gabi/Andi", "friends/Tom/Andi",
    ]);
    expect(upd["friends/Andi/Gabi"]).toEqual({ since: 1, via: "groups" });
  });
  it("Gabi und Tom teilen keine Gruppe und werden keine Freunde", () => {
    expect(upd["friends/Gabi/Tom"]).toBeUndefined();
  });
  it("gelöschte Konten fallen weg", () => {
    expect(Object.keys(upd).some((k) => k.includes("Weg"))).toBe(false);
  });
  it("Kategorien: Vereinigung der eigenen Gruppen, nur bekannte und aktive", () => {
    const cats = (n) => Object.keys(upd).filter((k) => k.startsWith("users/" + n + "/")).map((k) => k.split("/")[3]).sort();
    expect(cats("Andi")).toEqual(["film", "restaurant", "whisky"]);
    expect(cats("Gabi")).toEqual(["restaurant", "whisky"]);
    expect(cats("Tom")).toEqual(["film"]);
    expect(cats("Solo")).toEqual(["beer"]);
  });
});
