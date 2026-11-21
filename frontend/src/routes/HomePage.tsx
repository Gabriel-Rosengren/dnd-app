import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useIdentity, useSheetList } from "../lib/hooks";
import { api } from "../lib/api";
import { HpBar } from "../components/HpBar";

export function HomePage() {
  const sheets = useSheetList();
  const { identity } = useIdentity();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const sheet = await api.createSheet({
        name: "New Character",
        playerName: identity?.role === "player" ? identity.name : "",
      });
      navigate(`/sheets/${sheet.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete ${name || "this character"}? This can't be undone.`)) return;
    try {
      await api.deleteSheet(id);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Characters</h1>
        <button type="button" className="btn primary" onClick={create} disabled={busy}>
          + New character
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {sheets === null ? (
        <p className="muted">Loading…</p>
      ) : sheets.length === 0 ? (
        <p className="muted">No characters yet. Create one to get started.</p>
      ) : (
        <ul className="sheet-grid">
          {sheets.map((s) => (
            <li key={s.id} className="card sheet-card">
              <Link to={`/sheets/${s.id}`} className="sheet-card-link">
                <h2>{s.name || "Unnamed"}</h2>
                <p className="muted small">
                  {[s.race, s.classLabel || `Level ${s.level}`].filter(Boolean).join(" · ")}
                  {s.playerName ? ` — ${s.playerName}` : ""}
                </p>
                <div className="sheet-card-stats">
                  <span>
                    HP {s.hitPoints.current}/{s.hitPoints.max}
                  </span>
                  <span>AC {s.armorClass}</span>
                </div>
                <HpBar hp={s.hitPoints} />
              </Link>
              <button type="button" className="icon-btn delete" aria-label={`Delete ${s.name}`} onClick={() => remove(s.id, s.name)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
