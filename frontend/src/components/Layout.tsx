import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useIdentity } from "../lib/hooks";
import { ConnectionStatus } from "./ConnectionStatus";
import { IdentityDialog } from "./IdentityDialog";

export function Layout() {
  const { identity } = useIdentity();
  const [editing, setEditing] = useState(false);

  return (
    <div className="app">
      <header className="topbar">
        <NavLink to="/" className="brand">
          <span aria-hidden>⚔</span> Sheet Keeper
        </NavLink>
        <nav>
          <NavLink to="/" end>
            Characters
          </NavLink>
          <NavLink to="/party">Party</NavLink>
        </nav>
        <div className="topbar-right">
          <ConnectionStatus />
          {identity ? (
            <button type="button" className="chip" onClick={() => setEditing(true)} title="Change name or role">
              {identity.name}
              {identity.role === "dm" ? " · DM" : ""}
            </button>
          ) : null}
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      {!identity || editing ? <IdentityDialog onClose={identity ? () => setEditing(false) : undefined} /> : null}
    </div>
  );
}
