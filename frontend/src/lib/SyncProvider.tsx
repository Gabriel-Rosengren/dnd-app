import { useEffect, useState, type ReactNode } from "react";
import { SyncClient } from "./sync";
import { SyncContext } from "./hooks";

export function SyncProvider({ children, client }: { children: ReactNode; client?: SyncClient }) {
  const [sync] = useState(() => client ?? new SyncClient());

  useEffect(() => {
    sync.connect();
    return () => sync.disconnect();
  }, [sync]);

  return <SyncContext.Provider value={sync}>{children}</SyncContext.Provider>;
}
