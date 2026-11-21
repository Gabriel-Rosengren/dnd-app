import type { Participant } from "@dnd/shared";

export function Presence({ participants, meId }: { participants: Participant[]; meId?: string }) {
  if (participants.length === 0) return null;
  return (
    <ul className="presence" aria-label="Viewing this sheet">
      {participants.map((p) => (
        <li key={p.id} className={`avatar ${p.role}`} title={`${p.name}${p.role === "dm" ? " (DM)" : ""}`}>
          <span aria-hidden>{p.name.slice(0, 1).toUpperCase()}</span>
          <span className="avatar-name">
            {p.id === meId ? "You" : p.name}
            {p.role === "dm" ? " · DM" : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
