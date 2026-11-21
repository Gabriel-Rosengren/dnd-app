import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CONDITIONS, formatModifier, type SheetSummary } from "@dnd/shared";
import { useSheetList, useSync } from "../lib/hooks";
import { HpBar } from "../components/HpBar";
import { HpControl } from "../components/sheet/Combat";

type Sort = "name" | "initiative" | "hp";

const SORTS: Record<Sort, (a: SheetSummary, b: SheetSummary) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  initiative: (a, b) => b.initiative - a.initiative || a.name.localeCompare(b.name),
  hp: (a, b) => a.hitPoints.current / (a.hitPoints.max || 1) - b.hitPoints.current / (b.hitPoints.max || 1),
};

/** The DM screen: every character at a glance, updating live. */
export function PartyPage() {
  const sheets = useSheetList();
  const sync = useSync();
  const [sort, setSort] = useState<Sort>("name");
  const sorted = useMemo(() => (sheets ? [...sheets].sort(SORTS[sort]) : []), [sheets, sort]);

  if (sheets === null) return <div className="page muted">Loading party…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Party</h1>
        <div className="row" role="group" aria-label="Sort by">
          <span className="muted small">Sort</span>
          {(["name", "initiative", "hp"] as const).map((s) => (
            <button key={s} type="button" className={`chip ${sort === s ? "on" : ""}`} aria-pressed={sort === s} onClick={() => setSort(s)}>
              {s === "hp" ? "Lowest HP" : s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {sorted.length === 0 ? <p className="muted">No characters yet.</p> : null}

      <ul className="party-grid">
        {sorted.map((s) => (
          <PartyCard
            key={s.id}
            sheet={s}
            adjustHp={(n) => sync.adjustHp(s.id, n)}
            setConditions={(conditions) => sync.update(s.id, { conditions })}
            toggleInspiration={() => sync.update(s.id, { inspiration: !s.inspiration })}
          />
        ))}
      </ul>
    </div>
  );
}

function PartyCard({
  sheet: s,
  adjustHp,
  setConditions,
  toggleInspiration,
}: {
  sheet: SheetSummary;
  adjustHp: (n: number) => void;
  setConditions: (c: string[]) => void;
  toggleInspiration: () => void;
}) {
  const [adding, setAdding] = useState("");
  const down = s.hitPoints.current === 0;

  return (
    <li className={`card party-card ${down ? "down" : ""}`}>
      <header className="party-card-header">
        <div>
          <Link to={`/sheets/${s.id}`}>
            <h2>{s.name || "Unnamed"}</h2>
          </Link>
          <p className="muted small">
            {[s.race, s.classLabel || `Level ${s.level}`].filter(Boolean).join(" · ")}
            {s.playerName ? ` — ${s.playerName}` : ""}
          </p>
        </div>
        <button
          type="button"
          className={`chip small ${s.inspiration ? "on gold" : ""}`}
          aria-pressed={s.inspiration}
          title="Inspiration"
          onClick={toggleInspiration}
        >
          ★
        </button>
      </header>

      <div className="party-hp">
        <span className="hp-current">{s.hitPoints.current}</span>
        <span className="muted">/ {s.hitPoints.max}</span>
        {s.hitPoints.temporary > 0 ? <span className="hp-temp">+{s.hitPoints.temporary}</span> : null}
        {down ? (
          <span className="badge danger">
            Down · ✓{s.deathSaves.successes} ✗{s.deathSaves.failures}
          </span>
        ) : null}
      </div>
      <HpBar hp={s.hitPoints} />
      <HpControl adjustHp={adjustHp} compact />

      <dl className="party-stats">
        <div>
          <dt>AC</dt>
          <dd>{s.armorClass}</dd>
        </div>
        <div>
          <dt>Init</dt>
          <dd>{formatModifier(s.initiative)}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{s.passivePerception}</dd>
        </div>
        <div>
          <dt>Speed</dt>
          <dd>{s.speed}</dd>
        </div>
        {s.spellSaveDC !== undefined ? (
          <div>
            <dt>DC</dt>
            <dd>{s.spellSaveDC}</dd>
          </div>
        ) : null}
      </dl>

      <div className="chips">
        {s.conditions.map((c) => (
          <button
            key={c}
            type="button"
            className="chip small on warn"
            title="Remove condition"
            onClick={() => setConditions(s.conditions.filter((x) => x !== c))}
          >
            {c} ×
          </button>
        ))}
        <select
          className="small"
          aria-label="Add condition"
          value={adding}
          onChange={(e) => {
            if (e.target.value) setConditions([...s.conditions, e.target.value]);
            setAdding("");
          }}
        >
          <option value="">+ Condition</option>
          {CONDITIONS.filter((c) => !s.conditions.includes(c)).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </li>
  );
}
