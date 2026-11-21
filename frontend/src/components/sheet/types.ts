import type { Character, CharacterPatch } from "@dnd/shared";

export type SectionProps = {
  sheet: Character;
  update: (patch: CharacterPatch) => void;
  remoteChanges: Record<string, number>;
};
