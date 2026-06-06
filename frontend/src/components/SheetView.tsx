import type { CharacterData } from "@dnd/shared";

type Props = {
  character: CharacterData;
};

export function SheetView({ character }: Props) {
  return (
    <>
      <p>{character.name}</p>
      <p>{character.hitPoints.current}</p>
    </>
  );
}
