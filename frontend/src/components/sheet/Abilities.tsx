import { ABILITIES, ABILITY_NAMES, abilityModifier, formatModifier, savingThrowBonus } from "@dnd/shared";
import { NumberInput } from "../fields";
import { Section } from "./Section";
import type { SectionProps } from "./types";

export function Abilities({ sheet, update, remoteChanges }: SectionProps) {
  return (
    <Section title="Abilities" watch={["abilityScores", "savingThrows"]} remoteChanges={remoteChanges}>
      <div className="abilities">
        {ABILITIES.map((a) => (
          <div key={a} className="ability">
            <span className="ability-name" title={ABILITY_NAMES[a]}>{a}</span>
            <span className="ability-mod">{formatModifier(abilityModifier(sheet.abilityScores[a]))}</span>
            <NumberInput
              className="ability-score"
              aria-label={`${ABILITY_NAMES[a]} score`}
              min={1}
              max={30}
              value={sheet.abilityScores[a]}
              onCommit={(v) => update({ abilityScores: { [a]: v } })}
            />
            <button
              type="button"
              className={`save ${sheet.savingThrows[a] ? "on" : ""}`}
              aria-pressed={sheet.savingThrows[a]}
              title="Toggle saving throw proficiency"
              onClick={() => update({ savingThrows: { [a]: !sheet.savingThrows[a] } })}
            >
              <span className="dot" aria-hidden /> Save {formatModifier(savingThrowBonus(sheet, a))}
            </button>
          </div>
        ))}
      </div>
    </Section>
  );
}
