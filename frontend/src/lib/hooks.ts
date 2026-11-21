import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from "react";
import type { CharacterPatch } from "@dnd/shared";
import type { SyncClient } from "./sync";

export const SyncContext = createContext<SyncClient | null>(null);

export function useSync(): SyncClient {
  const sync = useContext(SyncContext);
  if (!sync) throw new Error("useSync must be used inside <SyncProvider>");
  return sync;
}

function useSyncValue<T>(select: (sync: SyncClient) => T): T {
  const sync = useSync();
  return useSyncExternalStore(sync.subscribe, () => select(sync));
}

export function useConnection() {
  return useSyncValue((s) => s.connection);
}

export function useIdentity() {
  const sync = useSync();
  const identity = useSyncValue((s) => s.identity);
  const me = useSyncValue((s) => s.me);
  return { identity, me, setIdentity: sync.setIdentity.bind(sync) };
}

/** Live state of one sheet plus helpers to edit it. */
export function useSheet(sheetId: string) {
  const sync = useSync();
  useEffect(() => sync.joinSheet(sheetId), [sync, sheetId]);
  const state = useSyncValue((s) => s.getSheet(sheetId));

  const update = useCallback((patch: CharacterPatch) => sync.update(sheetId, patch), [sync, sheetId]);
  const adjustHp = useCallback((amount: number) => sync.adjustHp(sheetId, amount), [sync, sheetId]);
  const rest = useCallback((kind: "short" | "long") => sync.rest(sheetId, kind), [sync, sheetId]);

  return { ...state, sheet: state.view, update, adjustHp, rest };
}

/** Live summaries of every sheet. `null` until the first list arrives. */
export function useSheetList() {
  const sync = useSync();
  useEffect(() => sync.watchSheetList(), [sync]);
  return useSyncValue((s) => s.sheetList);
}
