import { test } from "node:test";
import assert from "node:assert/strict";
import {
  adjustHitPoints,
  applyPatch,
  createDefaultCharacter,
  normalizeCharacter,
  parseClientMessage,
  recomputeDerived,
  restPatch,
} from "@dnd/shared";

test("applyPatch merges objects and replaces arrays", () => {
  const base = { a: { b: 1, c: 2 }, list: [1, 2, 3], x: "y" };
  assert.deepEqual(applyPatch(base, { a: { b: 5 }, list: [9] }), {
    a: { b: 5, c: 2 },
    list: [9],
    x: "y",
  });
});

test("derived fields follow class levels and abilities", () => {
  const char = normalizeCharacter({
    id: "x",
    classes: [{ name: "Wizard", level: 4 }, { name: "Cleric", level: 1 }],
    abilityScores: { INT: 18, WIS: 14 },
    skillProficiencies: { perception: "expertise", arcana: "proficient" },
    spellcastingAbility: "INT",
  });
  assert.equal(char.level, 5);
  assert.equal(char.proficiencyBonus, 3);
  assert.equal(char.skills.arcana, 4 + 3);
  assert.equal(char.passivePerception, 10 + 2 + 6);
  assert.equal(char.spellSaveDC, 8 + 3 + 4);
  assert.equal(char.spellAttackBonus, 7);
});

test("normalizeCharacter drops values with the wrong type", () => {
  const char = normalizeCharacter({ id: "x", hitPoints: "lots", armorClass: "12", name: 5 });
  assert.deepEqual(char.hitPoints, { current: 10, max: 10, temporary: 0 });
  assert.equal(char.armorClass, 10);
  assert.equal(char.name, "New Character");
});

test("damage is absorbed by temporary hit points first", () => {
  const char = recomputeDerived({
    ...createDefaultCharacter("x"),
    hitPoints: { current: 10, max: 20, temporary: 5 },
  });
  assert.deepEqual(adjustHitPoints(char, -8).hitPoints, { temporary: 0, current: 7 });
  assert.deepEqual(adjustHitPoints(char, -30).hitPoints, { temporary: 0, current: 0 });
  assert.deepEqual(adjustHitPoints(char, 50).hitPoints, { current: 20 });
});

test("long rest restores HP, slots and resources", () => {
  const char = {
    ...createDefaultCharacter("x"),
    hitPoints: { current: 1, max: 20, temporary: 3 },
    spellSlots: { 1: { total: 4, used: 3 } },
    classResources: [
      { name: "Rage", current: 0, max: 3, renewal: "longRest" as const },
      { name: "Ki", current: 0, max: 3, renewal: "shortRest" as const },
    ],
  };
  const long = restPatch(char, "long");
  assert.deepEqual(long.hitPoints, { current: 20, temporary: 0 });
  assert.deepEqual(long.spellSlots, { 1: { total: 4, used: 0 } });
  assert.deepEqual(long.classResources?.map((r) => r.current), [3, 3]);
  const short = restPatch(char, "short");
  assert.deepEqual(short.classResources?.map((r) => r.current), [0, 3]);
  assert.equal(short.hitPoints, undefined);
});

test("parseClientMessage validates and strips id from patches", () => {
  assert.equal(typeof parseClientMessage({ type: "update", data: {} }), "string");
  assert.equal(typeof parseClientMessage({ type: "hello", data: { name: "A", role: "god" } }), "string");
  assert.deepEqual(
    parseClientMessage({ type: "update", data: { sheetId: "1", patch: { id: "2", name: "N" }, seq: 3 } }),
    { type: "update", data: { sheetId: "1", patch: { name: "N" }, seq: 3 } },
  );
});

test("new and legacy sheets start with full hit dice", () => {
  const char = normalizeCharacter({ id: "x", classes: [{ name: "Rogue", level: 5 }] });
  assert.equal(char.currentHitDice, 5);
  assert.equal(normalizeCharacter({ ...char, currentHitDice: 2 }).currentHitDice, 2);
});
