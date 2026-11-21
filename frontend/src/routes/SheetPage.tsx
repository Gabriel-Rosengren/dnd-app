import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useIdentity, useSheet } from "../lib/hooks";
import { Presence } from "../components/Presence";
import { ActivityFeed } from "../components/ActivityFeed";
import { SheetHeader } from "../components/sheet/SheetHeader";
import { Abilities } from "../components/sheet/Abilities";
import { Skills } from "../components/sheet/Skills";
import { Combat } from "../components/sheet/Combat";
import { Attacks, Spellcasting } from "../components/sheet/Spells";
import { Inventory } from "../components/sheet/Inventory";
import { FeaturesAndTraits, Resources } from "../components/sheet/Features";
import { Story } from "../components/sheet/Story";

const TABS = [
  { id: "actions", label: "Actions & Spells" },
  { id: "features", label: "Features" },
  { id: "inventory", label: "Inventory" },
  { id: "story", label: "Story & Notes" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function SheetPage() {
  const { sheetId = "" } = useParams();
  const { sheet, status, participants, activity, remoteChanges, pending, update, adjustHp, rest } = useSheet(sheetId);
  const { me } = useIdentity();
  const [tab, setTab] = useState<TabId>("actions");

  if (status === "missing" || status === "deleted") {
    return (
      <div className="page">
        <h1>{status === "deleted" ? "This sheet was deleted" : "Sheet not found"}</h1>
        <Link to="/">Back to characters</Link>
      </div>
    );
  }
  if (!sheet) return <div className="page muted">Loading sheet…</div>;

  const props = { sheet, update, remoteChanges };

  return (
    <div className="page sheet-page">
      <div className="sheet-toolbar">
        <Link to="/" className="muted">
          ← Characters
        </Link>
        <Presence participants={participants} meId={me?.id} />
        <span className="muted small" aria-live="polite">
          {pending.length > 0 ? "Saving…" : "All changes saved"}
        </span>
      </div>

      <SheetHeader {...props} />

      <div className="sheet-columns">
        <div className="col-abilities">
          <Abilities {...props} />
        </div>
        <div className="col-skills">
          <Skills {...props} />
        </div>
        <div className="col-combat">
          <Combat {...props} adjustHp={adjustHp} rest={rest} />
        </div>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? "tab on" : "tab"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="sheet-bottom">
        <div className="tab-panel stack" role="tabpanel">
          {tab === "actions" ? (
            <>
              <Attacks {...props} />
              <Spellcasting {...props} />
            </>
          ) : null}
          {tab === "features" ? (
            <>
              <Resources {...props} />
              <FeaturesAndTraits {...props} />
            </>
          ) : null}
          {tab === "inventory" ? <Inventory {...props} /> : null}
          {tab === "story" ? <Story {...props} /> : null}
        </div>
        <aside className="card activity-card">
          <header className="card-header">
            <h2>Live activity</h2>
          </header>
          <ActivityFeed activity={activity} meId={me?.id} />
        </aside>
      </div>
    </div>
  );
}
