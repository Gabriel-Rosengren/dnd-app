export type Note = {
  id: string;
  type: "character" | "world";
  title: string;
  content: string;
  tags: Array<string>;
  createdAt: string;
  updatedAt: string;
};

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

export type Character = {
  id: string;
  name: string;
  playerName: string;
  classes: Array<{ name: string; level: number; subclass?: string }>;
  level: number;
  background: string;
  race: string;
  subrace?: string;
  alignment: string;
  experiencePoints: number;
  inspiration: boolean;

  abilityScores: Record<Ability, number>;
  proficiencyBonus: number;
  savingThrows: Record<Ability, boolean>;

  skills: Record<SkillName, number>;
  skillProficiencies: Partial<Record<SkillName, "proficient" | "expertise" | "none">>;
  passivePerception: number;

  hitPoints: {
    current: number;
    max: number;
    temporary: number;
  };
  hitDice: string;
  currentHitDice: number;
  maxHitDice: number;
  deathSaves: {
    successes: number;
    failures: number;
  };

  armorClass: number;
  initiative: number;
  speed: number;
  attacks: Array<Attack>;

  spellcastingAbility?: string;
  spellSaveDC?: number;
  spellAttackBonus?: number;
  spellSlots: Record<number, { total: number; used: number }>;
  spells: Array<Spell>;

  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
  equipment: Array<{ name: string; quantity: number; notes?: string }>;

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
};

export type JoinMessage = { type: "join"; data: { sheetId: string } };
export type LeaveMessage = { type: "leave"; data: { sheetId: string } };
export type UpdateMessage = { type: "update"; data: { sheetId: string; update: unknown } };

export type MessageData = JoinMessage | LeaveMessage | UpdateMessage;
