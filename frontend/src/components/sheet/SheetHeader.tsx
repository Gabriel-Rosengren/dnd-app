import type { CharacterClass } from "@dnd/shared";
import { Field, NumberInput, TextInput } from "../fields";
import { Section } from "./Section";
import type { SectionProps } from "./types";

export function SheetHeader({ sheet, update, remoteChanges }: SectionProps) {
  const setClasses = (classes: CharacterClass[]) => update({ classes });
  const setClass = (i: number, patch: Partial<CharacterClass>) =>
    setClasses(sheet.classes.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  return (
    <Section
      className="sheet-header"
      remoteChanges={remoteChanges}
      watch={["name", "playerName", "race", "background", "alignment", "classes", "experiencePoints", "inspiration"]}
    >
      <div className="header-top">
        <TextInput className="name-input" aria-label="Character name" value={sheet.name} onCommit={(name) => update({ name })} />
        <div className="header-badges">
          <span className="badge" title="Total level">Lv {sheet.level}</span>
          <button
            type="button"
            className={`chip ${sheet.inspiration ? "on gold" : ""}`}
            aria-pressed={sheet.inspiration}
            onClick={() => update({ inspiration: !sheet.inspiration })}
          >
            ★ Inspiration
          </button>
        </div>
      </div>

      <div className="grid-fields">
        <Field label="Player">
          <TextInput value={sheet.playerName} onCommit={(playerName) => update({ playerName })} />
        </Field>
        <Field label="Race">
          <TextInput value={sheet.race} onCommit={(race) => update({ race })} />
        </Field>
        <Field label="Background">
          <TextInput value={sheet.background} onCommit={(background) => update({ background })} />
        </Field>
        <Field label="Alignment">
          <TextInput value={sheet.alignment} onCommit={(alignment) => update({ alignment })} />
        </Field>
        <Field label="XP">
          <NumberInput min={0} value={sheet.experiencePoints} onCommit={(experiencePoints) => update({ experiencePoints })} />
        </Field>
      </div>

      <div className="classes">
        {sheet.classes.map((c, i) => (
          <div className="class-row" key={i}>
            <TextInput placeholder="Class" aria-label="Class" value={c.name} onCommit={(name) => setClass(i, { name })} />
            <TextInput placeholder="Subclass" aria-label="Subclass" value={c.subclass ?? ""} onCommit={(subclass) => setClass(i, { subclass })} />
            <NumberInput className="narrow" aria-label="Class level" min={1} max={20} value={c.level} onCommit={(level) => setClass(i, { level })} />
            {sheet.classes.length > 1 ? (
              <button type="button" className="icon-btn" aria-label="Remove class" onClick={() => setClasses(sheet.classes.filter((_, j) => j !== i))}>
                ×
              </button>
            ) : null}
          </div>
        ))}
        <button type="button" className="btn ghost small" onClick={() => setClasses([...sheet.classes, { name: "", level: 1 }])}>
          + Multiclass
        </button>
      </div>
    </Section>
  );
}
