import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { Character, MessageData } from "./types.js";
import { db } from "./db.js";

type AugmentedSocket = WebSocket & { isAlive?: boolean };

export default class WebSocketHandler {
  private port: number;
  private server: ReturnType<typeof createServer>;
  private wss: WebSocketServer;
  private interval: ReturnType<typeof setInterval> | null = null;
  private rooms: Map<string, Set<AugmentedSocket>> = new Map();
  private db: db;

  constructor(port: number) {
    this.port = port;
    this.server = createServer();
    this.wss = new WebSocketServer({ server: this.server });
    this.db = new db();
  }

  private sendError(ws: AugmentedSocket, message: string) {
    ws.send(JSON.stringify({ type: "error", data: { message } }));
  }

  private setupListeners(ws: AugmentedSocket) {
    ws.on("error", (error: Error) => console.error("Error:", error));
    // Make sure messages can't be sent to "nobody"
    ws.on("close", () => {
      this.rooms.forEach((sockets) => sockets.delete(ws));
    });

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", (raw: Buffer) => {
      let msg: MessageData; // re-write type to ensure full type safety

      try {
        msg = JSON.parse(raw.toString());
      } catch {
        this.sendError(ws, "Invalid JSON");
        return;
      }

      if (typeof msg.type !== "string") {
        this.sendError(ws, "Missing message type");
        return;
      }

      // Break out into functions
      switch (msg.type) {
        case "join": {
          console.log(msg);
          const sheetId: string = (msg.data as any).sheetId;
          if (typeof sheetId !== "string") {
            this.sendError(ws, "Invalid sheetId 1");
            break;
          }
          const foundSheet = this.db.get(sheetId);
          if (!foundSheet) {
            this.sendError(ws, "Invalid SheetId");
          }

          if (!this.rooms.has(sheetId)) {
            this.rooms.set(sheetId, new Set());
          }

          this.rooms.get(sheetId)!.add(ws);
          ws.send(JSON.stringify({ type: "data", data: foundSheet }));
          break;
        }

        case "leave": {
          const { sheetId } = msg.data as { sheetId: string };
          if (typeof sheetId !== "string") {
            this.sendError(ws, "Invalid sheetId");
            break;
          }
          this.rooms.get(sheetId)?.delete(ws);
          break;
        }

        case "update": {
          const { sheetId, data } = msg.data as {
            sheetId: string;
            data: Object; //Character;
          };

          if (typeof sheetId !== "string") {
            this.sendError(ws, "Invalid sheetId");
            break;
          }

          if (this.db.update(sheetId, data) === false) {
            this.sendError(ws, "Unable to update");
            break;
          }

          if (
            this.broadcastToRoom(sheetId, JSON.stringify(data), ws) === false
          ) {
            this.sendError(ws, "Unable to update");
          }
          ws.send(JSON.stringify({ type: "info", data: { message: "Ok" } }));
          break;
        }

        default:
          this.sendError(ws, `Unknown message type: ${msg.type}`);
      }
    });
  }

  start() {
    this.wss.on("error", (error: Error) => {
      console.error("Websocket Server Error:", error);
    });

    this.wss.on("close", () => {
      console.log("connection closed");
    });

    this.wss.on("connection", (ws: AugmentedSocket) => {
      ws.isAlive = true;
      this.setupListeners(ws);
      console.log("connected");
    });

    this.interval = setInterval(() => {
      this.wss.clients.forEach((socket) => {
        const ws = socket as AugmentedSocket;
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, 60000);

    setInterval(() => {
      console.log(this.wss.clients.size);
    }, 10000);

    this.server.listen(this.port, () => {
      console.log(`Websocket Server is listening on port ${this.port}`);
    });
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
