import type { Note } from "@dnd/shared";
import { Field, NumberInput, TextArea, TextInput } from "../fields";
import { ListEditor } from "./ListEditor";
import { Section } from "./Section";
import type { SectionProps } from "./types";

const TRAITS = [
  ["personalityTraits", "Personality traits"],
  ["ideals", "Ideals"],
  ["bonds", "Bonds"],
  ["flaws", "Flaws"],
] as const;

const LOOKS = [
  ["height", "Height"],
  ["weight", "Weight"],
  ["eyes", "Eyes"],
  ["skin", "Skin"],
  ["hair", "Hair"],
] as const;

function newNote(): Note {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), type: "character", title: "", content: "", tags: [], createdAt: now, updatedAt: now };
}

export function Story({ sheet, update, remoteChanges }: SectionProps) {
  return (
    <>
      <Section title="Personality" watch={TRAITS.map(([k]) => k)} remoteChanges={remoteChanges}>
        <div className="grid-2">
          {TRAITS.map(([key, label]) => (
            <Field key={key} label={label}>
              <TextArea rows={3} value={sheet[key]} onCommit={(v) => update({ [key]: v })} />
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Notes" watch={["notes"]} remoteChanges={remoteChanges}>
        <ListEditor<Note>
          items={sheet.notes}
          onChange={(notes) => update({ notes })}
          create={newNote}
          addLabel="Note"
          empty="Session notes, NPCs, clues… visible to the whole table."
          renderItem={(n, set) => {
            const touch = (patch: Partial<Note>) => set({ ...patch, updatedAt: new Date().toISOString() });
            return (
              <div className="note-row">
                <div className="row">
                  <TextInput placeholder="Title" aria-label="Note title" value={n.title} onCommit={(title) => touch({ title })} />
                  <select aria-label="Note type" value={n.type} onChange={(e) => touch({ type: e.target.value as Note["type"] })}>
                    <option value="character">Character</option>
                    <option value="world">World</option>
                  </select>
                </div>
                <TextArea ariaLabel="Note" rows={3} value={n.content} onCommit={(content) => touch({ content })} />
              </div>
            );
          }}
        />
      </Section>

      <Section title="Appearance & Backstory" watch={["age", "backstory", ...LOOKS.map(([k]) => k)]} remoteChanges={remoteChanges}>
        <div className="grid-fields">
          <Field label="Age">
            <NumberInput min={0} value={sheet.age} onCommit={(age) => update({ age })} />
          </Field>
          {LOOKS.map(([key, label]) => (
            <Field key={key} label={label}>
              <TextInput value={sheet[key]} onCommit={(v) => update({ [key]: v })} />
            </Field>
          ))}
        </div>
        <Field label="Backstory">
          <TextArea rows={6} value={sheet.backstory} onCommit={(backstory) => update({ backstory })} />
        </Field>
      </Section>
    </>
  );
}
