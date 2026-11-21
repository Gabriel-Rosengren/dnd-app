const LABELS: Record<string, string> = {
  hitPoints: "HP",
  armorClass: "AC",
  abilityScores: "ability scores",
  savingThrows: "saving throws",
  skillProficiencies: "skills",
  deathSaves: "death saves",
  spellSlots: "spell slots",
  classResources: "resources",
  experiencePoints: "XP",
  currentHitDice: "hit dice",
  playerName: "player name",
  personalityTraits: "personality",
  spellcastingAbility: "spellcasting ability",
  cp: "copper",
  sp: "silver",
  ep: "electrum",
  gp: "gold",
  pp: "platinum",
};

export function fieldLabel(key: string) {
  return LABELS[key] ?? key.replace(/([A-Z])/g, " $1").toLowerCase();
}
