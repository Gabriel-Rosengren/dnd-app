import type { EquipmentItem } from "@dnd/shared";
import { Field, NumberInput, TextArea, TextInput } from "../fields";
import { ListEditor } from "./ListEditor";
import { Section } from "./Section";
import type { SectionProps } from "./types";

const COINS = ["cp", "sp", "ep", "gp", "pp"] as const;

export function Inventory({ sheet, update, remoteChanges }: SectionProps) {
  return (
    <>
      <Section title="Coins" watch={[...COINS]} remoteChanges={remoteChanges}>
        <div className="coins">
          {COINS.map((c) => (
            <Field key={c} label={c.toUpperCase()} className={`coin coin-${c}`}>
              <NumberInput min={0} value={sheet[c]} onCommit={(v) => update({ [c]: v })} />
            </Field>
          ))}
        </div>
      </Section>
      <Section title="Equipment" watch={["equipment"]} remoteChanges={remoteChanges}>
        <ListEditor<EquipmentItem>
          items={sheet.equipment}
          onChange={(equipment) => update({ equipment })}
          create={() => ({ name: "", quantity: 1 })}
          addLabel="Item"
          empty="Pack is empty."
          renderItem={(item, set) => (
            <div className="item-row">
              <NumberInput className="narrow" aria-label="Quantity" min={0} value={item.quantity} onCommit={(quantity) => set({ quantity })} />
              <TextInput placeholder="Item" aria-label="Item name" value={item.name} onCommit={(name) => set({ name })} />
              <TextInput placeholder="Notes" aria-label="Item notes" value={item.notes ?? ""} onCommit={(notes) => set({ notes })} />
            </div>
          )}
        />
      </Section>
      <Section title="Treasure" watch={["treasure"]} remoteChanges={remoteChanges}>
        <TextArea ariaLabel="Treasure" rows={3} value={sheet.treasure} onCommit={(treasure) => update({ treasure })} />
      </Section>
    </>
  );
}
