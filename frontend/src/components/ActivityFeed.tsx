import { useEffect, useState } from "react";
import type { Activity } from "../lib/sync";
import { fieldLabel } from "../lib/fieldLabels";

function ago(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`;
}

export function ActivityFeed({ activity, meId }: { activity: Activity[]; meId?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(t);
  }, []);

  if (activity.length === 0) return <p className="muted small">No changes yet this session.</p>;
  return (
    <ol className="activity">
      {activity.slice(0, 12).map((a) => (
        <li key={a.id}>
          <strong className={a.by.role}>{a.by.id === meId ? "You" : a.by.name}</strong>{" "}
          changed {a.changed.map(fieldLabel).join(", ")}
          <span className="muted small"> · {ago(Math.max(0, now - a.at))}</span>
        </li>
      ))}
    </ol>
  );
}
