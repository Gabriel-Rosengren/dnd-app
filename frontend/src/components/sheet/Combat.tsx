import { useState } from "react";
import { CONDITIONS, formatModifier } from "@dnd/shared";
import { Field, NumberInput, Pips, TextInput } from "../fields";
import { HpBar } from "../HpBar";
import { Section } from "./Section";
import type { SectionProps } from "./types";

type Props = SectionProps & {
  adjustHp: (amount: number) => void;
  rest: (kind: "short" | "long") => void;
};

export function HpControl({ adjustHp, compact }: { adjustHp: (n: number) => void; compact?: boolean }) {
  const [amount, setAmount] = useState("");
  const n = Math.abs(Math.trunc(Number(amount)) || 0);
  const apply = (sign: 1 | -1) => {
    if (!n) return;
    adjustHp(sign * n);
    setAmount("");
  };
  return (
    <div className={`hp-control ${compact ? "compact" : ""}`}>
      <button type="button" className="btn danger" disabled={!n} onClick={() => apply(-1)}>
        Damage
      </button>
      <input
        aria-label="Amount"
        inputMode="numeric"
        placeholder="0"
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
        onKeyDown={(e) => {
          if (e.key === "Enter") apply(e.shiftKey ? 1 : -1);
        }}
      />
      <button type="button" className="btn success" disabled={!n} onClick={() => apply(1)}>
        Heal
      </button>
    </div>
  );
}

export function Combat({ sheet, update, remoteChanges, adjustHp, rest }: Props) {
  const hp = sheet.hitPoints;
  const [showAll, setShowAll] = useState(false);
  const conditions = showAll ? CONDITIONS : CONDITIONS.filter((c) => sheet.conditions.includes(c));
  const toggleCondition = (c: string) =>
    update({
      conditions: sheet.conditions.includes(c) ? sheet.conditions.filter((x) => x !== c) : [...sheet.conditions, c],
    });

  return (
    <div className="stack">
      <Section watch={["armorClass", "initiative", "speed"]} remoteChanges={remoteChanges}>
        <div className="stat-row">
          <Field label="Armor Class" className="stat">
            <NumberInput min={0} value={sheet.armorClass} onCommit={(armorClass) => update({ armorClass })} />
          </Field>
          <Field label="Initiative" className="stat">
            <NumberInput value={sheet.initiative} onCommit={(initiative) => update({ initiative })} />
          </Field>
          <Field label="Speed" className="stat">
            <NumberInput min={0} value={sheet.speed} onCommit={(speed) => update({ speed })} />
          </Field>
        </div>
      </Section>

      <Section title="Hit Points" watch={["hitPoints", "deathSaves"]} remoteChanges={remoteChanges}>
        <div className="hp-display">
          <span className="hp-current">{hp.current}</span>
          <span className="muted">/ {hp.max}</span>
          {hp.temporary > 0 ? <span className="hp-temp">+{hp.temporary} temp</span> : null}
        </div>
        <HpBar hp={hp} />
        <HpControl adjustHp={adjustHp} />
        <div className="stat-row small-stats">
          <Field label="Current">
            <NumberInput min={0} max={hp.max} value={hp.current} onCommit={(current) => update({ hitPoints: { current } })} />
          </Field>
          <Field label="Max">
            <NumberInput min={0} value={hp.max} onCommit={(max) => update({ hitPoints: { max } })} />
          </Field>
          <Field label="Temp">
            <NumberInput min={0} value={hp.temporary} onCommit={(temporary) => update({ hitPoints: { temporary } })} />
          </Field>
        </div>
        {hp.current === 0 || sheet.deathSaves.successes || sheet.deathSaves.failures ? (
          <div className="death-saves">
            <span className="field-label">Death saves</span>
            <span>
              <Pips
                label="Success"
                variant="success"
                total={3}
                filled={sheet.deathSaves.successes}
                onChange={(successes) => update({ deathSaves: { successes } })}
              />
            </span>
            <span>
              <Pips
                label="Failure"
                variant="danger"
                total={3}
                filled={sheet.deathSaves.failures}
                onChange={(failures) => update({ deathSaves: { failures } })}
              />
            </span>
          </div>
        ) : null}
      </Section>

      <Section title="Hit Dice & Rest" watch={["currentHitDice", "hitDice"]} remoteChanges={remoteChanges}>
        <div className="stat-row small-stats">
          <Field label="Die">
            <TextInput value={sheet.hitDice} onCommit={(hitDice) => update({ hitDice })} />
          </Field>
          <Field label={`Left (of ${sheet.maxHitDice})`}>
            <NumberInput
              min={0}
              max={sheet.maxHitDice}
              value={sheet.currentHitDice}
              onCommit={(currentHitDice) => update({ currentHitDice })}
            />
          </Field>
        </div>
        <div className="row">
          <button type="button" className="btn" onClick={() => rest("short")}>
            Short rest
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              if (confirm("Take a long rest? Restores HP, spell slots and resources.")) rest("long");
            }}
          >
            Long rest
          </button>
        </div>
      </Section>

      <Section
        title="Conditions"
        watch={["conditions"]}
        remoteChanges={remoteChanges}
        actions={
          <button type="button" className="btn ghost small" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Done" : "Edit"}
          </button>
        }
      >
        {conditions.length === 0 ? <p className="muted small">None</p> : null}
        <div className="chips">
          {conditions.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip ${sheet.conditions.includes(c) ? "on warn" : ""}`}
              aria-pressed={sheet.conditions.includes(c)}
              onClick={() => toggleCondition(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </Section>

      <p className="muted small center">
        Proficiency {formatModifier(sheet.proficiencyBonus)} · Passive Perception {sheet.passivePerception}
      </p>
    </div>
  );
}
