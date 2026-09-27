import { describe, it, expect } from "vitest";
import {
  cleanGroupName, groupNameError, newGroupId, groupRecord, sortIntoGroups, removeFromGroupsUpdate,
} from "./friendGroups.js";

const groups = {
  g1: { name: "Montagsrunde", members: { Maike: true, Gabi: true, Weg: true } },
  g2: { name: "Familie", members: { Gabi: true } },
  g3: { name: "Leer" },
};

describe("Name", () => {
  it("wird bereinigt und gekürzt", () => {
    expect(cleanGroupName("  Montags   runde ")).toBe("Montags runde");
    expect(cleanGroupName("x".repeat(40))).toHaveLength(30);
  });
  it("muss da sein und eindeutig (ohne Groß/Klein)", () => {
    expect(groupNameError("", groups)).toBe("Bitte gib der Gruppe einen Namen.");
    expect(groupNameError("familie", groups)).toBe("Eine Gruppe mit diesem Namen gibt es schon.");
    expect(groupNameError("Familie", groups, "g2")).toBeNull();
    expect(groupNameError("Kollegen", groups)).toBeNull();
  });
});

describe("Datensatz", () => {
  it("Mitglieder als Objekt", () => {
    expect(groupRecord("Familie", ["Gabi", "Tom"])).toEqual({ name: "Familie", members: { Gabi: true, Tom: true } });
  });
  it("Kennung ist ein gültiger Firebase-Schlüssel", () => {
    expect(newGroupId(1790000000000, 0.123456)).toMatch(/^g[a-z0-9]+$/);
  });
});

describe("sortIntoGroups", () => {
  const friends = ["Andi", "Gabi", "Maike", "Tom"];
  const r = sortIntoGroups(groups, friends);
  it("Gruppen alphabetisch, Mitglieder nur aktuelle Freunde", () => {
    expect(r.groups.map((g) => [g.name, g.members])).toEqual([
      ["Familie", ["Gabi"]],
      ["Leer", []],
      ["Montagsrunde", ["Gabi", "Maike"]],
    ]);
  });
  it("Freunde ohne Gruppe bleiben übrig, einer in zwei Gruppen zählt einmal", () => {
    expect(r.ungrouped).toEqual(["Andi", "Tom"]);
  });
  it("ohne Gruppen sind alle ungruppiert", () => {
    expect(sortIntoGroups(null, friends)).toEqual({ groups: [], ungrouped: friends });
  });
});

describe("removeFromGroupsUpdate", () => {
  it("trägt aus allen Gruppen aus, in denen der Freund steht", () => {
    expect(removeFromGroupsUpdate("Andi", groups, "Gabi")).toEqual({
      "users/Andi/friendGroups/g1/members/Gabi": null,
      "users/Andi/friendGroups/g2/members/Gabi": null,
    });
    expect(removeFromGroupsUpdate("Andi", groups, "Tom")).toEqual({});
  });
});
