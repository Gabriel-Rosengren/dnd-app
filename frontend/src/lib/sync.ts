import {
  applyPatch,
  recomputeDerived,
  type Character,
  type CharacterPatch,
  type ClientMessage,
  type Participant,
  type Role,
  type ServerMessage,
  type SheetSummary,
} from "@dnd/shared";
import { WS_URL } from "./config";

export type ConnectionState = "connecting" | "open" | "closed";

export type Identity = { name: string; role: Role };

export type Activity = {
  id: number;
  by: Participant;
  changed: string[];
  at: number;
};

export type SheetState = {
  /** Server-confirmed sheet. */
  server?: Character;
  /** Local edits not yet confirmed by the server, oldest first. */
  pending: Array<{ seq: number; patch: CharacterPatch }>;
  /** What the UI shows: server state with pending edits applied on top. */
  view?: Character;
  participants: Participant[];
  activity: Activity[];
  /** Field name → time it was last changed by someone else. */
  remoteChanges: Record<string, number>;
  status: "loading" | "ready" | "missing" | "deleted";
};

const EMPTY_SHEET: SheetState = {
  pending: [],
  participants: [],
  activity: [],
  remoteChanges: {},
  status: "loading",
};

const IDENTITY_KEY = "dnd.identity";

function loadIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.name === "string" && (parsed.role === "dm" || parsed.role === "player")) {
      return parsed;
    }
  } catch {
    /* storage unavailable */
  }
  return null;
}

/**
 * One WebSocket connection shared by the whole app.
 *
 * - Reconnects with backoff and re-joins rooms / re-sends unconfirmed edits.
 * - Edits are optimistic: they show immediately and are reconciled when the
 *   server acknowledges them, so typing never "jumps back".
 * - Exposes immutable snapshots for React's useSyncExternalStore.
 */
export class SyncClient {
  private ws: WebSocket | null = null;
  private seq = 0;
  private retry = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<() => void>();
  private roomRefs = new Map<string, number>();
  private listWatchers = 0;
  private activityId = 0;

  connection: ConnectionState = "closed";
  identity: Identity | null = loadIdentity();
  me: Participant | null = null;
  sheets = new Map<string, SheetState>();
  sheetList: SheetSummary[] | null = null;
  lastError: string | null = null;

  private url: string;

  constructor(url = WS_URL) {
    this.url = url;
  }

  /* ------------------------------ lifecycle ------------------------------ */

  connect() {
    if (this.ws) return;
    this.setConnection("connecting");
    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.addEventListener("open", () => {
      this.retry = 0;
      this.setConnection("open");
      if (this.identity) this.raw({ type: "hello", data: this.identity });
      if (this.listWatchers > 0) this.raw({ type: "watchList", data: { watch: true } });
      for (const sheetId of this.roomRefs.keys()) this.raw({ type: "join", data: { sheetId } });
      // Re-send anything the server never confirmed. Patches are idempotent.
      for (const [sheetId, state] of this.sheets) {
        for (const p of state.pending) {
          this.raw({ type: "update", data: { sheetId, patch: p.patch, seq: p.seq } });
        }
      }
    });

    ws.addEventListener("message", (event) => {
      try {
        this.onMessage(JSON.parse(event.data) as ServerMessage);
      } catch (error) {
        console.error("Bad message from server", error);
      }
    });

    ws.addEventListener("close", () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.setConnection("closed");
      const delay = Math.min(10_000, 500 * 2 ** this.retry++);
      this.reconnectTimer = setTimeout(() => this.connect(), delay);
    });
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const ws = this.ws;
    this.ws = null;
    ws?.close();
    this.setConnection("closed");
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit() {
    for (const l of this.listeners) l();
  }

  private setConnection(state: ConnectionState) {
    this.connection = state;
    this.emit();
  }

  private raw(message: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  /* ------------------------------ identity ------------------------------- */

  setIdentity(identity: Identity) {
    this.identity = identity;
    try {
      localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
    } catch {
      /* storage unavailable */
    }
    this.raw({ type: "hello", data: identity });
    this.emit();
  }

  /* -------------------------------- rooms -------------------------------- */

  /** Subscribe to a sheet. Returns a function that unsubscribes. */
  joinSheet(sheetId: string) {
    const refs = this.roomRefs.get(sheetId) ?? 0;
    this.roomRefs.set(sheetId, refs + 1);
    if (refs === 0) {
      if (!this.sheets.has(sheetId)) this.updateSheet(sheetId, () => ({ ...EMPTY_SHEET }));
      this.raw({ type: "join", data: { sheetId } });
    }
    return () => {
      const left = (this.roomRefs.get(sheetId) ?? 1) - 1;
      if (left > 0) {
        this.roomRefs.set(sheetId, left);
        return;
      }
      this.roomRefs.delete(sheetId);
      this.raw({ type: "leave", data: { sheetId } });
    };
  }

  watchSheetList() {
    if (this.listWatchers++ === 0) this.raw({ type: "watchList", data: { watch: true } });
    return () => {
      if (--this.listWatchers === 0) this.raw({ type: "watchList", data: { watch: false } });
    };
  }

  /* ------------------------------- editing ------------------------------- */

  /** Optimistically apply a partial update and send it to the server. */
  update(sheetId: string, patch: CharacterPatch) {
    const seq = ++this.seq;
    this.updateSheet(sheetId, (s) => withView({ ...s, pending: [...s.pending, { seq, patch }] }));
    this.raw({ type: "update", data: { sheetId, patch, seq } });
  }

  /** Damage (negative) or heal (positive). Resolved on the server so concurrent hits stack. */
  adjustHp(sheetId: string, amount: number) {
    if (!amount) return;
    this.raw({ type: "adjustHp", data: { sheetId, amount, seq: ++this.seq } });
  }

  rest(sheetId: string, kind: "short" | "long") {
    this.raw({ type: "rest", data: { sheetId, kind, seq: ++this.seq } });
  }

  /* ------------------------------- inbound ------------------------------- */

  private onMessage(msg: ServerMessage) {
    switch (msg.type) {
      case "welcome":
        this.me = msg.data.you;
        this.emit();
        return;

      case "sheet": {
        const { sheet, by, changed = [], ack } = msg.data;
        const remote = by && by.id !== this.me?.id;
        const now = Date.now();
        this.updateSheet(sheet.id, (s) => {
          const next: SheetState = {
            ...s,
            server: sheet,
            status: "ready",
            pending: ack === undefined ? s.pending : s.pending.filter((p) => p.seq > ack),
          };
          if (by && changed.length) {
            next.activity = [{ id: ++this.activityId, by, changed, at: now }, ...s.activity].slice(0, 30);
          }
          if (remote) {
            next.remoteChanges = { ...s.remoteChanges };
            for (const key of changed) next.remoteChanges[key] = now;
          }
          return withView(next);
        });
        return;
      }

      case "presence":
        this.updateSheet(msg.data.sheetId, (s) => ({ ...s, participants: msg.data.participants }));
        return;

      case "deleted":
        this.updateSheet(msg.data.sheetId, (s) => ({ ...s, status: "deleted", participants: [] }));
        return;

      case "sheetList":
        this.sheetList = msg.data.sheets;
        this.emit();
        return;

      case "error": {
        const { sheetId, ack, message } = msg.data;
        if (sheetId && message === "Sheet not found") {
          this.updateSheet(sheetId, (s) => ({ ...s, status: s.status === "deleted" ? "deleted" : "missing" }));
        }
        if (sheetId && ack !== undefined) {
          this.updateSheet(sheetId, (s) => withView({ ...s, pending: s.pending.filter((p) => p.seq !== ack) }));
        }
        this.lastError = message;
        console.warn("Server error:", message);
        this.emit();
        return;
      }
    }
  }

  getSheet(sheetId: string): SheetState {
    return this.sheets.get(sheetId) ?? EMPTY_SHEET;
  }

  private updateSheet(sheetId: string, fn: (s: SheetState) => SheetState) {
    this.sheets.set(sheetId, fn(this.getSheet(sheetId)));
    this.emit();
  }
}

function withView(state: SheetState): SheetState {
  if (!state.server) return { ...state, view: undefined };
  if (state.pending.length === 0) return { ...state, view: state.server };
  const merged = state.pending.reduce<Character>((acc, p) => applyPatch(acc, p.patch), state.server);
  return { ...state, view: recomputeDerived(merged) };
}
