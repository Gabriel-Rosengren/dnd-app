import { ABILITIES, formatModifier, type Ability, type Attack, type Spell } from "@dnd/shared";
import { Field, NumberInput, Pips, TextInput } from "../fields";
import { ListEditor } from "./ListEditor";
import { Section } from "./Section";
import type { SectionProps } from "./types";

export function Attacks({ sheet, update, remoteChanges }: SectionProps) {
  return (
    <Section title="Attacks" watch={["attacks"]} remoteChanges={remoteChanges}>
      <ListEditor<Attack>
        items={sheet.attacks}
        onChange={(attacks) => update({ attacks })}
        create={() => ({ name: "", attackBonus: 0, damage: "1d6", damageType: "" })}
        addLabel="Attack"
        empty="No attacks yet."
        renderItem={(a, set) => (
          <div className="attack-row">
            <TextInput placeholder="Name" aria-label="Attack name" value={a.name} onCommit={(name) => set({ name })} />
            <NumberInput className="narrow" aria-label="Attack bonus" value={a.attackBonus} onCommit={(attackBonus) => set({ attackBonus })} />
            <TextInput className="narrow" placeholder="1d8+3" aria-label="Damage" value={a.damage} onCommit={(damage) => set({ damage })} />
            <TextInput placeholder="Type" aria-label="Damage type" value={a.damageType} onCommit={(damageType) => set({ damageType })} />
          </div>
        )}
      />
    </Section>
  );
}

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function Spellcasting({ sheet, update, remoteChanges }: SectionProps) {
  const slot = (lvl: number) => sheet.spellSlots[lvl] ?? { total: 0, used: 0 };
  const setSlot = (lvl: number, patch: Partial<{ total: number; used: number }>) => {
    const next = { ...slot(lvl), ...patch };
    next.used = Math.min(next.used, next.total);
    update({ spellSlots: { [lvl]: next } });
  };

  return (
    <>
      <Section title="Spellcasting" watch={["spellcastingAbility", "spellSlots"]} remoteChanges={remoteChanges}>
        <div className="stat-row">
          <Field label="Ability">
            <select
              value={sheet.spellcastingAbility ?? ""}
              onChange={(e) => update({ spellcastingAbility: (e.target.value || null) as Ability | undefined })}
            >
              <option value="">None</option>
              {ABILITIES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </Field>
          <div className="field stat">
            <span className="field-label">Save DC</span>
            <strong className="big">{sheet.spellSaveDC ?? "—"}</strong>
          </div>
          <div className="field stat">
            <span className="field-label">Attack</span>
            <strong className="big">
              {sheet.spellAttackBonus !== undefined ? formatModifier(sheet.spellAttackBonus) : "—"}
            </strong>
          </div>
        </div>

        <table className="slots">
          <thead>
            <tr>
              <th>Level</th>
              <th>Slots</th>
              <th>Remaining</th>
            </tr>
          </thead>
          <tbody>
            {LEVELS.map((lvl) => {
              const s = slot(lvl);
              return (
                <tr key={lvl}>
                  <td>{lvl}</td>
                  <td>
                    <NumberInput className="narrow" aria-label={`Level ${lvl} slots`} min={0} max={9} value={s.total} onCommit={(total) => setSlot(lvl, { total })} />
                  </td>
                  <td>
                    {s.total > 0 ? (
                      <Pips
                        label={`Level ${lvl} slot`}
                        total={s.total}
                        filled={s.total - s.used}
                        onChange={(remaining) => setSlot(lvl, { used: s.total - remaining })}
                      />
                    ) : (
                      <span className="muted small">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Section>

      <Section title="Spells" watch={["spells"]} remoteChanges={remoteChanges}>
        <ListEditor<Spell>
          items={sheet.spells}
          onChange={(spells) => update({ spells })}
          create={() => ({ name: "", level: 0, prepared: false })}
          addLabel="Spell"
          empty="No spells known."
          renderItem={(s, set) => (
            <div className="spell-row">
              <button
                type="button"
                className={`chip small ${s.prepared ? "on" : ""}`}
                aria-pressed={s.prepared}
                title="Prepared"
                onClick={() => set({ prepared: !s.prepared })}
              >
                {s.prepared ? "Prepared" : "Prep"}
              </button>
              <TextInput placeholder="Spell name" aria-label="Spell name" value={s.name} onCommit={(name) => set({ name })} />
              <label className="inline">
                <span className="muted small">Lv</span>
                <NumberInput className="narrow" aria-label="Spell level" min={0} max={9} value={s.level} onCommit={(level) => set({ level })} />
              </label>
              <button
                type="button"
                className={`chip small ${s.concentration ? "on" : ""}`}
                aria-pressed={!!s.concentration}
                title="Concentration"
                onClick={() => set({ concentration: !s.concentration })}
              >
                C
              </button>
              <button
                type="button"
                className={`chip small ${s.ritual ? "on" : ""}`}
                aria-pressed={!!s.ritual}
                title="Ritual"
                onClick={() => set({ ritual: !s.ritual })}
              >
                R
              </button>
            </div>
          )}
        />
      </Section>
    </>
  );
}
