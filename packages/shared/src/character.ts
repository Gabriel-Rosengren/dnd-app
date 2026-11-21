import type {
  Ability,
  Character,
  CharacterPatch,
  SheetSummary,
  SkillName,
} from "./types.js";

export const ABILITIES: Array<Ability> = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

export const ABILITY_NAMES: Record<Ability, string> = {
  STR: "Strength",
  DEX: "Dexterity",
  CON: "Constitution",
  INT: "Intelligence",
  WIS: "Wisdom",
  CHA: "Charisma",
};

export const SKILLS: Record<SkillName, { label: string; ability: Ability }> = {
  acrobatics: { label: "Acrobatics", ability: "DEX" },
  animalHandling: { label: "Animal Handling", ability: "WIS" },
  arcana: { label: "Arcana", ability: "INT" },
  athletics: { label: "Athletics", ability: "STR" },
  deception: { label: "Deception", ability: "CHA" },
  history: { label: "History", ability: "INT" },
  insight: { label: "Insight", ability: "WIS" },
  intimidation: { label: "Intimidation", ability: "CHA" },
  investigation: { label: "Investigation", ability: "INT" },
  medicine: { label: "Medicine", ability: "WIS" },
  nature: { label: "Nature", ability: "INT" },
  perception: { label: "Perception", ability: "WIS" },
  performance: { label: "Performance", ability: "CHA" },
  persuasion: { label: "Persuasion", ability: "CHA" },
  religion: { label: "Religion", ability: "INT" },
  sleightOfHand: { label: "Sleight of Hand", ability: "DEX" },
  stealth: { label: "Stealth", ability: "DEX" },
  survival: { label: "Survival", ability: "WIS" },
};

export const SKILL_NAMES = Object.keys(SKILLS) as Array<SkillName>;

export const CONDITIONS = [
  "Blinded",
  "Charmed",
  "Deafened",
  "Exhaustion",
  "Frightened",
  "Grappled",
  "Incapacitated",
  "Invisible",
  "Paralyzed",
  "Petrified",
  "Poisoned",
  "Prone",
  "Restrained",
  "Stunned",
  "Unconscious",
  "Concentrating",
];

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

export function calculateProficiencyBonus(level: number): number {
  return Math.ceil(Math.max(1, level) / 4) + 1;
}

export function skillBonus(char: Character, skill: SkillName): number {
  const mod = abilityModifier(char.abilityScores[SKILLS[skill].ability]);
  const prof = char.skillProficiencies[skill] ?? "none";
  const multiplier = prof === "expertise" ? 2 : prof === "proficient" ? 1 : 0;
  return mod + multiplier * char.proficiencyBonus;
}

export function savingThrowBonus(char: Character, ability: Ability): number {
  const mod = abilityModifier(char.abilityScores[ability]);
  return mod + (char.savingThrows[ability] ? char.proficiencyBonus : 0);
}

export function classLabel(char: Pick<Character, "classes">): string {
  return char.classes
    .filter((c) => c.name)
    .map((c) => `${c.name}${c.subclass ? ` (${c.subclass})` : ""} ${c.level}`)
    .join(" / ");
}

export function createDefaultCharacter(id: string, name = "New Character"): Character {
  const abilities = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };
  const base: Character = {
    id,
    name,
    playerName: "",
    classes: [{ name: "", level: 1 }],
    level: 1,
    background: "",
    race: "",
    alignment: "",
    experiencePoints: 0,
    inspiration: false,

    abilityScores: { ...abilities },
    proficiencyBonus: 2,
    savingThrows: { STR: false, DEX: false, CON: false, INT: false, WIS: false, CHA: false },

    skills: Object.fromEntries(SKILL_NAMES.map((s) => [s, 0])) as Record<SkillName, number>,
    skillProficiencies: {},
    passivePerception: 10,

    hitPoints: { current: 10, max: 10, temporary: 0 },
    hitDice: "d8",
    currentHitDice: 1,
    maxHitDice: 1,
    deathSaves: { successes: 0, failures: 0 },
    conditions: [],

    armorClass: 10,
    initiative: 0,
    speed: 30,
    attacks: [],

    spellSlots: {},
    spells: [],

    cp: 0,
    sp: 0,
    ep: 0,
    gp: 0,
    pp: 0,
    equipment: [],

    personalityTraits: "",
    ideals: "",
    bonds: "",
    flaws: "",
    classResources: [],
    features: [],
    feats: [],

    languages: [],
    armorProficiencies: [],
    weaponProficiencies: [],
    toolProficiencies: [],

    age: 0,
    height: "",
    weight: "",
    eyes: "",
    skin: "",
    hair: "",

    backstory: "",
    allies: [],
    treasure: "",

    campaigns: [],
    notes: [],

    updatedAt: new Date().toISOString(),
  };
  return recomputeDerived(base);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Recursively merge `patch` into `target`, returning a new object.
 * Objects merge; arrays, primitives and null replace.
 */
export function applyPatch<T>(target: T, patch: unknown): T {
  if (!isPlainObject(patch) || !isPlainObject(target)) {
    return (patch === undefined ? target : patch) as T;
  }
  const result: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    result[key] = isPlainObject(value) && isPlainObject(result[key])
      ? applyPatch(result[key], value)
      : value;
  }
  return result as T;
}

const OPTIONAL_FIELDS: Record<string, "string"> = {
  subrace: "string",
  spellcastingAbility: "string",
};

function kindOf(value: unknown) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  if (typeof value === "number" && !Number.isFinite(value)) return "nan";
  return typeof value;
}

/**
 * Drop values whose type doesn't match the shape of `schema` (recursively for
 * known objects), so a bad update can't corrupt a sheet.
 */
function sanitize(schema: Record<string, unknown>, value: Record<string, unknown>, top = false) {
  const out: Record<string, unknown> = {};
  const isRecord = Object.keys(schema).length === 0; // e.g. spellSlots: any keys allowed
  for (const [key, v] of Object.entries(value)) {
    if (v === undefined) continue;
    if (top && key in OPTIONAL_FIELDS) {
      if (v === null || typeof v === OPTIONAL_FIELDS[key]) out[key] = v ?? undefined;
      continue;
    }
    if (!(key in schema)) {
      if (isRecord && !top && kindOf(v) !== "nan") out[key] = v;
      continue;
    }
    const expected = kindOf(schema[key]);
    if (kindOf(v) !== expected) continue;
    out[key] = expected === "object"
      ? sanitize(schema[key] as Record<string, unknown>, v as Record<string, unknown>)
      : v;
  }
  return out;
}

/** Fill in any missing fields (e.g. legacy/seed data) and recompute derived values. */
export function normalizeCharacter(raw: unknown, fallbackId?: string): Character {
  const obj = isPlainObject(raw) ? raw : {};
  const id = typeof obj.id === "string" ? obj.id : (fallbackId ?? "");
  const defaults = createDefaultCharacter(id, typeof obj.name === "string" ? obj.name : undefined);
  const clean = sanitize(defaults as unknown as Record<string, unknown>, obj, true);
  const merged = applyPatch(defaults, { ...clean, id });
  for (const key of Object.keys(OPTIONAL_FIELDS)) {
    if ((merged as Record<string, unknown>)[key] == null) delete (merged as Record<string, unknown>)[key];
  }
  const result = recomputeDerived(merged);
  // Sheets that never tracked hit dice start with all of them available.
  if (typeof clean.currentHitDice !== "number") result.currentHitDice = result.maxHitDice;
  return result;
}

/** Recompute fields that follow from other fields so every client sees consistent numbers. */
export function recomputeDerived(char: Character): Character {
  const classLevels = char.classes.reduce((sum, c) => sum + (Number(c.level) || 0), 0);
  const level = char.classes.length > 0 ? Math.max(1, classLevels) : Math.max(1, char.level);
  const proficiencyBonus = calculateProficiencyBonus(level);
  const next: Character = { ...char, level, proficiencyBonus, maxHitDice: level };

  next.skills = Object.fromEntries(
    SKILL_NAMES.map((s) => [s, skillBonus(next, s)]),
  ) as Record<SkillName, number>;
  next.passivePerception = 10 + next.skills.perception;
  next.currentHitDice = Math.max(0, Math.min(next.currentHitDice, level));

  if (next.spellcastingAbility) {
    const mod = abilityModifier(next.abilityScores[next.spellcastingAbility]);
    next.spellSaveDC = 8 + proficiencyBonus + mod;
    next.spellAttackBonus = proficiencyBonus + mod;
  } else {
    delete next.spellSaveDC;
    delete next.spellAttackBonus;
  }

  next.hitPoints = {
    max: Math.max(0, next.hitPoints.max),
    current: Math.max(0, Math.min(next.hitPoints.current, next.hitPoints.max)),
    temporary: Math.max(0, next.hitPoints.temporary),
  };
  return next;
}

export function clampHitPoints(
  current: number,
  max: number,
  temporary: number = 0,
): { current: number; max: number; temporary: number } {
  return {
    current: Math.max(0, Math.min(current, max)),
    max,
    temporary: Math.max(0, temporary),
  };
}

/** Apply damage (negative) or healing (positive). Temporary HP absorbs damage first. */
export function adjustHitPoints(char: Character, amount: number): CharacterPatch {
  const hp = char.hitPoints;
  if (amount >= 0) {
    const current = Math.min(hp.max, hp.current + amount);
    // Any healing brings a dying character back and resets death saves.
    const patch: CharacterPatch = { hitPoints: { current } };
    if (hp.current === 0 && current > 0) patch.deathSaves = { successes: 0, failures: 0 };
    return patch;
  }
  let damage = -amount;
  const absorbed = Math.min(hp.temporary, damage);
  damage -= absorbed;
  return {
    hitPoints: {
      temporary: hp.temporary - absorbed,
      current: Math.max(0, hp.current - damage),
    },
  };
}

export function restPatch(char: Character, kind: "short" | "long"): CharacterPatch {
  const restores = kind === "long" ? ["shortRest", "longRest"] : ["shortRest"];
  const patch: CharacterPatch = {
    classResources: char.classResources.map((r) =>
      restores.includes(r.renewal) ? { ...r, current: r.max } : r,
    ),
  };
  if (kind === "long") {
    patch.hitPoints = { current: char.hitPoints.max, temporary: 0 };
    patch.deathSaves = { successes: 0, failures: 0 };
    patch.currentHitDice = Math.min(
      char.maxHitDice,
      char.currentHitDice + Math.max(1, Math.floor(char.maxHitDice / 2)),
    );
    patch.spellSlots = Object.fromEntries(
      Object.entries(char.spellSlots).map(([lvl, slot]) => [lvl, { ...slot, used: 0 }]),
    );
  }
  return patch;
}

export function summarize(char: Character): SheetSummary {
  return {
    id: char.id,
    name: char.name,
    playerName: char.playerName,
    race: char.race,
    classLabel: classLabel(char),
    level: char.level,
    hitPoints: char.hitPoints,
    armorClass: char.armorClass,
    passivePerception: char.passivePerception,
    initiative: char.initiative,
    speed: char.speed,
    inspiration: char.inspiration,
    conditions: char.conditions,
    deathSaves: char.deathSaves,
    spellSaveDC: char.spellSaveDC,
    updatedAt: char.updatedAt,
  };
}
