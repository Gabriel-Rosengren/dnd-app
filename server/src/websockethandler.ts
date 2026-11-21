import type { Server } from "http";
import { randomUUID } from "crypto";
import { WebSocketServer, WebSocket } from "ws";
import {
  adjustHitPoints,
  parseClientMessage,
  restPatch,
  summarize,
  type Character,
  type ClientMessage,
  type Participant,
  type ServerMessage,
} from "@dnd/shared";
import type { ChangeInfo, SheetStore } from "./db.js";

type Client = {
  socket: WebSocket;
  participant: Participant;
  rooms: Set<string>;
  watchingList: boolean;
  isAlive: boolean;
};

export type WebSocketHandlerOptions = { heartbeatMs?: number; path?: string };

export default class WebSocketHandler {
  private wss: WebSocketServer;
  private interval: ReturnType<typeof setInterval> | null = null;
  private clients = new Map<WebSocket, Client>();
  private rooms = new Map<string, Set<Client>>();
  private lastListPayload = "";
  private heartbeatMs: number;

  constructor(
    server: Server,
    private store: SheetStore,
    options: WebSocketHandlerOptions = {},
  ) {
    this.wss = new WebSocketServer({ server, path: options.path });
    this.heartbeatMs = options.heartbeatMs ?? 30_000;
  }

  start() {
    this.wss.on("error", (error) => console.error("WebSocket server error:", error));
    this.wss.on("connection", (socket) => this.onConnection(socket));

    this.store.on("change", this.onSheetChange);
    this.store.on("create", this.onListChange);
    this.store.on("delete", this.onSheetDelete);

    this.interval = setInterval(() => {
      for (const client of this.clients.values()) {
        if (!client.isAlive) {
          client.socket.terminate();
          continue;
        }
        client.isAlive = false;
        client.socket.ping();
      }
    }, this.heartbeatMs);
  }

  stop(): Promise<void> {
    if (this.interval) clearInterval(this.interval);
    this.store.off("change", this.onSheetChange);
    this.store.off("create", this.onListChange);
    this.store.off("delete", this.onSheetDelete);
    for (const client of this.clients.values()) client.socket.terminate();
    return new Promise((resolve) => this.wss.close(() => resolve()));
  }

  /* ---------------------------------------------------------------- */

  private onConnection(socket: WebSocket) {
    const client: Client = {
      socket,
      participant: { id: randomUUID().slice(0, 8), name: "Anonymous", role: "player" },
      rooms: new Set(),
      watchingList: false,
      isAlive: true,
    };
    this.clients.set(socket, client);

    socket.on("error", (error) => console.error("WebSocket error:", error));
    socket.on("pong", () => (client.isAlive = true));
    socket.on("close", () => this.onClose(client));
    socket.on("message", (raw) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw.toString());
      } catch {
        this.send(client, { type: "error", data: { message: "Invalid JSON" } });
        return;
      }
      const msg = parseClientMessage(parsed);
      if (typeof msg === "string") {
        this.send(client, { type: "error", data: { message: msg } });
        return;
      }
      this.handle(client, msg);
    });

    this.send(client, { type: "welcome", data: { you: client.participant } });
  }

  private onClose(client: Client) {
    this.clients.delete(client.socket);
    for (const sheetId of client.rooms) {
      this.rooms.get(sheetId)?.delete(client);
      this.broadcastPresence(sheetId);
    }
  }

  private handle(client: Client, msg: ClientMessage) {
    switch (msg.type) {
      case "hello":
        client.participant = { ...client.participant, ...msg.data };
        this.send(client, { type: "welcome", data: { you: client.participant } });
        for (const sheetId of client.rooms) this.broadcastPresence(sheetId);
        return;

      case "join": {
        const sheet = this.store.get(msg.data.sheetId);
        if (!sheet) {
          this.send(client, {
            type: "error",
            data: { message: "Sheet not found", sheetId: msg.data.sheetId },
          });
          return;
        }
        let room = this.rooms.get(sheet.id);
        if (!room) this.rooms.set(sheet.id, (room = new Set()));
        room.add(client);
        client.rooms.add(sheet.id);
        this.send(client, { type: "sheet", data: { sheet } });
        this.broadcastPresence(sheet.id);
        return;
      }

      case "leave":
        this.rooms.get(msg.data.sheetId)?.delete(client);
        client.rooms.delete(msg.data.sheetId);
        this.broadcastPresence(msg.data.sheetId);
        return;

      case "watchList":
        client.watchingList = msg.data.watch;
        if (client.watchingList) {
          this.send(client, { type: "sheetList", data: { sheets: this.summaries() } });
        }
        return;

      case "update":
        this.mutate(client, msg.data.sheetId, msg.data.seq, () => msg.data.patch);
        return;

      case "adjustHp":
        this.mutate(client, msg.data.sheetId, msg.data.seq, (sheet) =>
          adjustHitPoints(sheet, msg.data.amount),
        );
        return;

      case "rest":
        this.mutate(client, msg.data.sheetId, msg.data.seq, (sheet) =>
          restPatch(sheet, msg.data.kind),
        );
        return;
    }
  }

  /** Apply a change to a sheet. The store emits an event which fans out to every client. */
  private mutate(
    client: Client,
    sheetId: string,
    seq: number | undefined,
    makePatch: (sheet: Character) => Parameters<SheetStore["patch"]>[1],
  ) {
    const sheet = this.store.get(sheetId);
    if (!sheet) {
      this.send(client, { type: "error", data: { message: "Sheet not found", sheetId, ack: seq } });
      return;
    }
    this.store.patch(sheetId, makePatch(sheet), {
      by: client.participant,
      ack: seq === undefined ? undefined : { socketId: client.participant.id, seq },
    });
  }

  /* ---------------------------------------------------------------- */
  /* Store events                                                     */
  /* ---------------------------------------------------------------- */

  private onSheetChange = (sheet: Character, info: ChangeInfo) => {
    const room = this.rooms.get(sheet.id);
    for (const client of room ?? []) {
      const isAuthor = info.ack && info.ack.socketId === client.participant.id;
      this.send(client, {
        type: "sheet",
        data: { sheet, by: info.by, changed: info.changed, ack: isAuthor ? info.ack!.seq : undefined },
      });
    }
    // The author may have edited without joining (e.g. from the DM overview) – still ack them.
    if (info.ack) {
      const author = [...this.clients.values()].find((c) => c.participant.id === info.ack!.socketId);
      if (author && !room?.has(author)) {
        this.send(author, { type: "sheet", data: { sheet, by: info.by, changed: info.changed, ack: info.ack.seq } });
      }
    }
    this.onListChange();
  };

  private onSheetDelete = (sheetId: string) => {
    for (const client of this.rooms.get(sheetId) ?? []) {
      client.rooms.delete(sheetId);
      this.send(client, { type: "deleted", data: { sheetId } });
    }
    this.rooms.delete(sheetId);
    this.onListChange();
  };

  /** Push the sheet list to watchers, but only when the summaries actually changed. */
  private onListChange = () => {
    const sheets = this.summaries();
    const payload = JSON.stringify(sheets.map(({ updatedAt: _u, ...rest }) => rest));
    if (payload === this.lastListPayload) return;
    this.lastListPayload = payload;
    for (const client of this.clients.values()) {
      if (client.watchingList) this.send(client, { type: "sheetList", data: { sheets } });
    }
  };

  /* ---------------------------------------------------------------- */

  private summaries() {
    return this.store.list().map(summarize);
  }

  private broadcastPresence(sheetId: string) {
    const room = this.rooms.get(sheetId);
    if (!room) return;
    if (room.size === 0) {
      this.rooms.delete(sheetId);
      return;
    }
    const participants = [...room].map((c) => c.participant);
    for (const client of room) {
      this.send(client, { type: "presence", data: { sheetId, participants } });
    }
  }

  private send(client: Client, message: ServerMessage) {
    if (client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify(message));
    }
  }
}
