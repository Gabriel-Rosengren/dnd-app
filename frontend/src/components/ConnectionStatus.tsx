import { useConnection } from "../lib/hooks";

const LABELS = { open: "Live", connecting: "Connecting…", closed: "Offline – reconnecting" };

export function ConnectionStatus() {
  const state = useConnection();
  return (
    <span className={`conn conn-${state}`} role="status">
      <span className="conn-dot" aria-hidden />
      {LABELS[state]}
    </span>
  );
}
