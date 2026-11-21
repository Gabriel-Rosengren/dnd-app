export type Ability = "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA";

export type SkillName =
  | "acrobatics"
  | "animalHandling"
  | "arcana"
  | "athletics"
  | "deception"
  | "history"
  | "insight"
  | "intimidation"
  | "investigation"
  | "medicine"
  | "nature"
  | "perception"
  | "performance"
  | "persuasion"
  | "religion"
  | "sleightOfHand"
  | "stealth"
  | "survival";

export type Proficiency = "proficient" | "expertise" | "none";

export type Note = {
  id: string;
  type: "character" | "world";
  title: string;
  content: string;
  tags: Array<string>;
  createdAt: string;
  updatedAt: string;
};

export type Attack = {
  name: string;
  attackBonus: number;
  damage: string;
  damageType: string;
  notes?: string;
};

export type Spell = {
  name: string;
  level: number;
  prepared: boolean;
  school?: string;
  components?: string;
  concentration?: boolean;
  ritual?: boolean;
};

export type ClassResource = {
  name: string;
  current: number;
  max: number;
  renewal: "shortRest" | "longRest" | "dawn" | "special";
};

export type Feature = {
  name: string;
  description: string;
  source?: string;
};

export type EquipmentItem = { name: string; quantity: number; notes?: string };

export type CharacterClass = { name: string; level: number; subclass?: string };

export type Character = {
  id: string;
  name: string;
  playerName: string;
  classes: Array<CharacterClass>;
  /** Derived: sum of class levels (when any classes are set). */
  level: number;
  background: string;
  race: string;
  subrace?: string;
  alignment: string;
  experiencePoints: number;
  inspiration: boolean;

  abilityScores: Record<Ability, number>;
  /** Derived from level. */
  proficiencyBonus: number;
  savingThrows: Record<Ability, boolean>;

  /** Derived: total bonus per skill. */
  skills: Record<SkillName, number>;
  skillProficiencies: Partial<Record<SkillName, Proficiency>>;
  /** Derived: 10 + perception bonus. */
  passivePerception: number;

  hitPoints: { current: number; max: number; temporary: number };
  hitDice: string;
  currentHitDice: number;
  maxHitDice: number;
  deathSaves: { successes: number; failures: number };
  conditions: Array<string>;

  armorClass: number;
  initiative: number;
  speed: number;
  attacks: Array<Attack>;

  spellcastingAbility?: Ability;
  /** Derived when a spellcasting ability is set. */
  spellSaveDC?: number;
  /** Derived when a spellcasting ability is set. */
  spellAttackBonus?: number;
  spellSlots: Record<number, { total: number; used: number }>;
  spells: Array<Spell>;

  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
  equipment: Array<EquipmentItem>;

  personalityTraits: string;
  ideals: string;
  bonds: string;
  flaws: string;
  classResources: Array<ClassResource>;
  features: Array<Feature>;
  feats: Array<string>;

  languages: Array<string>;
  armorProficiencies: Array<string>;
  weaponProficiencies: Array<string>;
  toolProficiencies: Array<string>;

  age: number;
  height: string;
  weight: string;
  eyes: string;
  skin: string;
  hair: string;

  backstory: string;
  allies: Array<{ name: string; description: string }>;
  treasure: string;

  campaigns: Array<string>;
  notes: Array<Note>;

  updatedAt: string;
};

/**
 * A partial update. Objects are merged recursively, arrays and primitives are
 * replaced wholesale. This lets the DM and player edit different fields of the
 * same sheet at the same time without overwriting each other.
 */
export type DeepPartial<T> = T extends Array<unknown>
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

export type CharacterPatch = DeepPartial<Omit<Character, "id">>;

/** Compact view of a sheet, used for lists and the DM party overview. */
export type SheetSummary = {
  id: string;
  name: string;
  playerName: string;
  race: string;
  classLabel: string;
  level: number;
  hitPoints: Character["hitPoints"];
  armorClass: number;
  passivePerception: number;
  initiative: number;
  speed: number;
  inspiration: boolean;
  conditions: Array<string>;
  deathSaves: Character["deathSaves"];
  spellSaveDC?: number;
  updatedAt: string;
};

export type Role = "dm" | "player";

export type Participant = { id: string; name: string; role: Role };

/* ------------------------------------------------------------------ */
/* WebSocket protocol                                                  */
/* ------------------------------------------------------------------ */

/** Client → server */
export type HelloMessage = { type: "hello"; data: { name: string; role: Role } };
export type JoinMessage = { type: "join"; data: { sheetId: string } };
export type LeaveMessage = { type: "leave"; data: { sheetId: string } };
export type UpdateMessage = {
  type: "update";
  data: { sheetId: string; patch: CharacterPatch; seq?: number };
};
export type AdjustHpMessage = {
  type: "adjustHp";
  /** Positive heals, negative deals damage (temporary HP absorbs it first). */
  data: { sheetId: string; amount: number; seq?: number };
};
export type RestMessage = {
  type: "rest";
  data: { sheetId: string; kind: "short" | "long"; seq?: number };
};
export type WatchListMessage = { type: "watchList"; data: { watch: boolean } };

export type ClientMessage =
  | HelloMessage
  | JoinMessage
  | LeaveMessage
  | UpdateMessage
  | AdjustHpMessage
  | RestMessage
  | WatchListMessage;

/** @deprecated kept for backwards compatibility, use ClientMessage */
export type MessageData = ClientMessage;

/** Server → client */
export type WelcomeEvent = { type: "welcome"; data: { you: Participant } };
export type SheetEvent = {
  type: "sheet";
  data: {
    sheet: Character;
    /** Who caused this change (absent for the initial join snapshot). */
    by?: Participant;
    /** Top-level fields that changed. */
    changed?: Array<string>;
    /** Present only on the copy sent to the author: highest seq applied. */
    ack?: number;
  };
};
export type PresenceEvent = {
  type: "presence";
  data: { sheetId: string; participants: Array<Participant> };
};
export type SheetDeletedEvent = { type: "deleted"; data: { sheetId: string } };
export type SheetListEvent = { type: "sheetList"; data: { sheets: Array<SheetSummary> } };
export type ErrorEvent = {
  type: "error";
  data: { message: string; sheetId?: string; ack?: number };
};

export type ServerMessage =
  | WelcomeEvent
  | SheetEvent
  | PresenceEvent
  | SheetDeletedEvent
  | SheetListEvent
  | ErrorEvent;
