import type { ClassResource, Feature } from "@dnd/shared";
import { Field, NumberInput, Pips, TextArea, TextInput } from "../fields";
import { ListEditor } from "./ListEditor";
import { Section } from "./Section";
import { stringToTags, tagsToString } from "./tags";
import type { SectionProps } from "./types";

const RENEWAL: Record<ClassResource["renewal"], string> = {
  shortRest: "Short rest",
  longRest: "Long rest",
  dawn: "Dawn",
  special: "Special",
};

export function Resources({ sheet, update, remoteChanges }: SectionProps) {
  return (
    <Section title="Class Resources" watch={["classResources"]} remoteChanges={remoteChanges}>
      <ListEditor<ClassResource>
        items={sheet.classResources}
        onChange={(classResources) => update({ classResources })}
        create={() => ({ name: "", current: 1, max: 1, renewal: "longRest" })}
        addLabel="Resource"
        empty="Rage, Ki, Channel Divinity, Superiority Dice…"
        renderItem={(r, set) => (
          <div className="resource-row">
            <TextInput placeholder="Resource" aria-label="Resource name" value={r.name} onCommit={(name) => set({ name })} />
            {r.max <= 10 ? (
              <Pips label={r.name || "Use"} total={r.max} filled={r.current} onChange={(current) => set({ current })} />
            ) : (
              <NumberInput className="narrow" aria-label="Current" min={0} max={r.max} value={r.current} onCommit={(current) => set({ current })} />
            )}
            <label className="inline">
              <span className="muted small">max</span>
              <NumberInput className="narrow" aria-label="Max" min={0} value={r.max} onCommit={(max) => set({ max, current: Math.min(r.current, max) })} />
            </label>
            <select aria-label="Recharges on" value={r.renewal} onChange={(e) => set({ renewal: e.target.value as ClassResource["renewal"] })}>
              {Object.entries(RENEWAL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        )}
      />
    </Section>
  );
}

export function FeaturesAndTraits({ sheet, update, remoteChanges }: SectionProps) {
  return (
    <>
      <Section title="Features & Traits" watch={["features"]} remoteChanges={remoteChanges}>
        <ListEditor<Feature>
          items={sheet.features}
          onChange={(features) => update({ features })}
          create={() => ({ name: "", description: "" })}
          addLabel="Feature"
          empty="No features yet."
          renderItem={(f, set) => (
            <div className="feature-row">
              <div className="row">
                <TextInput placeholder="Feature" aria-label="Feature name" value={f.name} onCommit={(name) => set({ name })} />
                <TextInput placeholder="Source" aria-label="Feature source" value={f.source ?? ""} onCommit={(source) => set({ source })} />
              </div>
              <TextArea ariaLabel="Description" rows={2} value={f.description} onCommit={(description) => set({ description })} />
            </div>
          )}
        />
      </Section>
      <Section
        title="Proficiencies & Languages"
        watch={["feats", "languages", "armorProficiencies", "weaponProficiencies", "toolProficiencies"]}
        remoteChanges={remoteChanges}
      >
        <p className="muted small">Comma separated.</p>
        {(
          [
            ["feats", "Feats"],
            ["languages", "Languages"],
            ["armorProficiencies", "Armor"],
            ["weaponProficiencies", "Weapons"],
            ["toolProficiencies", "Tools"],
          ] as const
        ).map(([key, label]) => (
          <Field key={key} label={label}>
            <TextInput
              value={tagsToString(sheet[key])}
              onCommit={(v) => update({ [key]: stringToTags(v) })}
            />
          </Field>
        ))}
      </Section>
    </>
  );
}
