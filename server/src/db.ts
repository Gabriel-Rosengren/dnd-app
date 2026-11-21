import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { dirname } from "path";
import {
  applyPatch,
  normalizeCharacter,
  recomputeDerived,
  type Character,
  type CharacterPatch,
  type Participant,
} from "@dnd/shared";

/** Where sheets are kept between restarts. */
export interface Persistence {
  load(): unknown[] | undefined;
  save(sheets: Character[]): void;
}

export class MemoryPersistence implements Persistence {
  constructor(private initial?: unknown[]) {}
  load() {
    return this.initial;
  }
  save() {}
}

export class JsonFilePersistence implements Persistence {
  constructor(private file: string) {}

  load() {
    if (!existsSync(this.file)) return undefined;
    const parsed = JSON.parse(readFileSync(this.file, "utf8"));
    return Array.isArray(parsed) ? parsed : undefined;
  }

  save(sheets: Character[]) {
    mkdirSync(dirname(this.file), { recursive: true });
    // Write to a temp file then rename so a crash never leaves a half-written file.
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(sheets, null, 2));
    renameSync(tmp, this.file);
  }
}

export const SEED_SHEETS: unknown[] = [
  {
    id: "1",
    name: "Tink Fiddleton",
    race: "Rock Gnome",
    classes: [{ name: "Artificer", level: 3, subclass: "Artillerist" }],
    abilityScores: { STR: 8, DEX: 14, CON: 14, INT: 17, WIS: 12, CHA: 10 },
    savingThrows: { CON: true, INT: true },
    skillProficiencies: { arcana: "proficient", investigation: "proficient", perception: "proficient" },
    hitPoints: { current: 20, max: 24, temporary: 0 },
    armorClass: 16,
    initiative: 2,
    speed: 25,
    spellcastingAbility: "INT",
    spellSlots: { 1: { total: 3, used: 1 } },
  },
  {
    id: "2",
    name: "Formik 'Spores' Doeger Rowynn Piddock Yddae",
    race: "Firbolg",
    classes: [{ name: "Druid", level: 3, subclass: "Circle of Spores" }],
    abilityScores: { STR: 10, DEX: 12, CON: 14, INT: 11, WIS: 17, CHA: 9 },
    savingThrows: { INT: true, WIS: true },
    skillProficiencies: { nature: "proficient", medicine: "proficient", perception: "proficient" },
    hitPoints: { current: 20, max: 24, temporary: 0 },
    armorClass: 14,
    initiative: 1,
    spellcastingAbility: "WIS",
    spellSlots: { 1: { total: 4, used: 0 }, 2: { total: 2, used: 0 } },
  },
  {
    id: "3",
    name: "Jacob Moss",
    race: "Human",
    classes: [{ name: "Fighter", level: 3, subclass: "Battle Master" }],
    abilityScores: { STR: 16, DEX: 13, CON: 15, INT: 10, WIS: 12, CHA: 10 },
    savingThrows: { STR: true, CON: true },
    skillProficiencies: { athletics: "proficient", intimidation: "proficient" },
    hitPoints: { current: 20, max: 31, temporary: 0 },
    armorClass: 18,
    initiative: 1,
    hitDice: "d10",
    classResources: [
      { name: "Superiority Dice", current: 4, max: 4, renewal: "shortRest" },
      { name: "Second Wind", current: 1, max: 1, renewal: "shortRest" },
    ],
  },
];

export type ChangeInfo = { by?: Participant; changed: string[]; ack?: { socketId: string; seq: number } };

export interface SheetStoreEvents {
  change: [sheet: Character, info: ChangeInfo];
  delete: [sheetId: string];
  create: [sheet: Character];
}

/**
 * Single source of truth for sheets. Both REST and WebSocket go through this,
 * and it emits events so every connected client hears about every change.
 */
export class SheetStore extends EventEmitter<SheetStoreEvents> {
  private sheets = new Map<string, Character>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private persistence: Persistence = new MemoryPersistence(SEED_SHEETS),
    private saveDelayMs = 250,
  ) {
    super();
    const loaded = persistence.load() ?? SEED_SHEETS;
    for (const raw of loaded) {
      const sheet = normalizeCharacter(raw);
      if (sheet.id) this.sheets.set(sheet.id, sheet);
    }
  }

  list(): Character[] {
    return [...this.sheets.values()];
  }

  get(id: string): Character | undefined {
    return this.sheets.get(id);
  }

  create(data: unknown = {}): Character {
    let id = randomUUID().slice(0, 8);
    while (this.sheets.has(id)) id = randomUUID().slice(0, 8);
    const sheet = normalizeCharacter({ ...(data as object), id, updatedAt: now() });
    this.sheets.set(id, sheet);
    this.scheduleSave();
    this.emit("create", sheet);
    return sheet;
  }

  /** Merge a partial update into a sheet. */
  patch(id: string, patch: CharacterPatch, info: Omit<ChangeInfo, "changed"> = {}): Character | undefined {
    const existing = this.sheets.get(id);
    if (!existing) return undefined;
    const { id: _ignored, ...safePatch } = patch as CharacterPatch & { id?: unknown };
    void _ignored;
    const merged = applyPatch(existing, { ...safePatch, updatedAt: now() });
    const sheet = recomputeDerived(normalizeCharacter(merged, id));
    this.sheets.set(id, sheet);
    this.scheduleSave();
    this.emit("change", sheet, { ...info, changed: Object.keys(safePatch) });
    return sheet;
  }

  /** Replace an entire sheet. */
  replace(id: string, data: unknown, info: Omit<ChangeInfo, "changed"> = {}): Character | undefined {
    if (!this.sheets.has(id)) return undefined;
    const sheet = normalizeCharacter({ ...(data as object), id, updatedAt: now() });
    this.sheets.set(id, sheet);
    this.scheduleSave();
    this.emit("change", sheet, { ...info, changed: Object.keys(data as object) });
    return sheet;
  }

  delete(id: string): boolean {
    if (!this.sheets.delete(id)) return false;
    this.scheduleSave();
    this.emit("delete", id);
    return true;
  }

  private scheduleSave() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => this.flush(), this.saveDelayMs);
  }

  flush() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = null;
    try {
      this.persistence.save(this.list());
    } catch (error) {
      console.error("Failed to save sheets:", error);
    }
  }
}

function now() {
  return new Date().toISOString();
}
