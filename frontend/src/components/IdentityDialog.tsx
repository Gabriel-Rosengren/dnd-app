import { useState } from "react";
import type { Role } from "@dnd/shared";
import { useIdentity } from "../lib/hooks";

export function IdentityDialog({ onClose }: { onClose?: () => void }) {
  const { identity, setIdentity } = useIdentity();
  const [name, setName] = useState(identity?.name ?? "");
  const [role, setRole] = useState<Role>(identity?.role ?? "player");

  return (
    <div className="modal-backdrop">
      <form
        className="modal card"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setIdentity({ name: name.trim(), role });
          onClose?.();
        }}
      >
        <h2>Who's at the table?</h2>
        <p className="muted">Others see this name next to the changes you make.</p>
        <label className="field">
          <span className="field-label">Your name</span>
          <input autoFocus value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="role-picker" role="radiogroup" aria-label="Role">
          {(["player", "dm"] as const).map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={role === r}
              className={role === r ? "chip on" : "chip"}
              onClick={() => setRole(r)}
            >
              {r === "dm" ? "Dungeon Master" : "Player"}
            </button>
          ))}
        </div>
        <div className="row end">
          {onClose && identity ? (
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
          ) : null}
          <button className="btn primary" disabled={!name.trim()}>
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}
