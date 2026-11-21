import { SKILLS, SKILL_NAMES, formatModifier, type Proficiency } from "@dnd/shared";
import { Section } from "./Section";
import type { SectionProps } from "./types";

const NEXT: Record<Proficiency, Proficiency> = { none: "proficient", proficient: "expertise", expertise: "none" };
const TITLE: Record<Proficiency, string> = { none: "Not proficient", proficient: "Proficient", expertise: "Expertise" };

export function Skills({ sheet, update, remoteChanges }: SectionProps) {
  return (
    <Section
      title="Skills"
      watch={["skillProficiencies", "abilityScores"]}
      remoteChanges={remoteChanges}
      actions={<span className="muted small">Prof. +{sheet.proficiencyBonus}</span>}
    >
      <ul className="skills">
        {SKILL_NAMES.map((s) => {
          const prof = sheet.skillProficiencies[s] ?? "none";
          return (
            <li key={s}>
              <button
                type="button"
                className={`prof prof-${prof}`}
                title={`${TITLE[prof]} – click to change`}
                aria-label={`${SKILLS[s].label}: ${TITLE[prof]}`}
                onClick={() => update({ skillProficiencies: { [s]: NEXT[prof] } })}
              />
              <span className="skill-bonus">{formatModifier(sheet.skills[s])}</span>
              <span className="skill-name">{SKILLS[s].label}</span>
              <span className="muted small">{SKILLS[s].ability}</span>
            </li>
          );
        })}
      </ul>
      <p className="passive">
        Passive Perception <strong>{sheet.passivePerception}</strong>
      </p>
    </Section>
  );
}
