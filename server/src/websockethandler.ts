import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import type {
  JoinMessage,
  LeaveMessage,
  UpdateMessage,
  MessageData,
} from "@dnd/shared";
import type { Database } from "./db.js";

type AugmentedSocket = WebSocket & { isAlive?: boolean };

export default class WebSocketHandler {
  private wss: WebSocketServer;
  private interval: ReturnType<typeof setInterval> | null = null;
  private rooms: Map<string, Set<AugmentedSocket>> = new Map();
  private db: Database;

  constructor(server: Server, db: Database) {
    this.wss = new WebSocketServer({ server });
    this.db = db;
  }

  private sendError(ws: AugmentedSocket, message: string) {
    ws.send(JSON.stringify({ type: "error", data: { message } }));
  }

  private setupListeners(ws: AugmentedSocket) {
    ws.on("error", (error: Error) => console.error("Error:", error));

    ws.on("close", () => {
      this.rooms.forEach((sockets) => sockets.delete(ws));
    });

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", (raw: Buffer) => {
      let msg: MessageData;

      try {
        msg = JSON.parse(raw.toString());
      } catch {
        this.sendError(ws, "Invalid JSON");
        return;
      }

      switch (msg.type) {
        case "join":
          this.handleJoin(ws, msg.data);
          break;
        case "leave":
          this.handleLeave(ws, msg.data);
          break;
        case "update":
          this.handleUpdate(ws, msg.data);
          break;
        default:
          this.sendError(
            ws,
            `Unknown message type: ${(msg as MessageData).type}`,
          );
      }
    });
  }

  private handleJoin(ws: AugmentedSocket, data: JoinMessage["data"]) {
    if (!this.rooms.has(data.sheetId)) {
      this.rooms.set(data.sheetId, new Set());
    }

    this.rooms.get(data.sheetId)!.add(ws);
    ws.send(JSON.stringify({ type: "data", data: this.db.get(data.sheetId) }));
  }

  private handleLeave(ws: AugmentedSocket, data: LeaveMessage["data"]) {
    this.rooms.get(data.sheetId)?.delete(ws);
  }

  private handleUpdate(ws: AugmentedSocket, data: UpdateMessage["data"]) {
    if (this.db.update(data.sheetId, data.update as Object) === false) {
      this.sendError(ws, "Unable to update");
      return;
    }

    if (
      this.broadcastToRoom(
        data.sheetId,
        JSON.stringify({ type: "data", data: data.update }),
        ws,
      ) === false
    ) {
      this.sendError(ws, "Unable to update");
      return;
    }

    ws.send(JSON.stringify({ type: "info", data: { message: "Ok" } }));
  }

  start() {
    this.wss.on("error", (error: Error) => {
      console.error("Websocket Server Error:", error);
    });

    this.wss.on("close", () => {
      console.log("Websocket Server Closed");
    });

    this.wss.on("connection", (ws: AugmentedSocket) => {
      ws.isAlive = true;
      this.setupListeners(ws);
    });

    this.interval = setInterval(() => {
      this.wss.clients.forEach((socket) => {
        const ws = socket as AugmentedSocket;
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, 60000);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.wss.close(() => {
      console.log("Websocket Server has been stopped.");
    });
  }

  broadcast(message: string) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  private broadcastToRoom(
    sheetId: string,
    message: string,
    sender: AugmentedSocket,
  ) {
    const room = this.rooms.get(sheetId);

    if (room === undefined) {
      return false;
    }

    room!.forEach((client) => {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });

    return true;
  }
}
