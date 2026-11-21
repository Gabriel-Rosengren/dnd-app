import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "http";
import type { AddressInfo } from "net";
import { WebSocket } from "ws";
import type { ServerMessage } from "@dnd/shared";
import { MemoryPersistence, SEED_SHEETS, SheetStore } from "../src/db.js";
import createApp from "../src/app.js";
import WebSocketHandler from "../src/websockethandler.js";

let server: Server;
let handler: WebSocketHandler;
let base: string;
const sockets: TestClient[] = [];

class TestClient {
  ws: WebSocket;
  inbox: ServerMessage[] = [];
  private waiters: Array<() => void> = [];

  constructor(url: string) {
    this.ws = new WebSocket(url);
    this.ws.on("message", (raw) => {
      this.inbox.push(JSON.parse(raw.toString()));
      this.waiters.splice(0).forEach((w) => w());
    });
    sockets.push(this);
  }

  opened() {
    return new Promise((resolve) => this.ws.once("open", resolve));
  }

  send(type: string, data: unknown) {
    this.ws.send(JSON.stringify({ type, data }));
  }

  /** Resolve with (and consume) the first message matching the predicate. */
  async next<T extends ServerMessage["type"]>(
    type: T,
    where: (m: Extract<ServerMessage, { type: T }>) => boolean = () => true,
  ): Promise<Extract<ServerMessage, { type: T }>> {
    const deadline = Date.now() + 2000;
    for (;;) {
      const i = this.inbox.findIndex((m) => m.type === type && where(m as never));
      if (i !== -1) return this.inbox.splice(i, 1)[0] as never;
      if (Date.now() > deadline) throw new Error(`Timed out waiting for ${type}`);
      await new Promise<void>((r) => {
        this.waiters.push(r);
        setTimeout(r, 50);
      });
    }
  }
}

async function connect(name: string, role: "dm" | "player") {
  const c = new TestClient(base.replace("http", "ws"));
  await c.opened();
  c.send("hello", { name, role });
  await c.next("welcome", (m) => m.data.you.name === name);
  return c;
}

beforeEach(async () => {
  const store = new SheetStore(new MemoryPersistence(structuredClone(SEED_SHEETS)));
  server = createServer(createApp(store));
  handler = new WebSocketHandler(server, store);
  handler.start();
  await new Promise<void>((r) => server.listen(0, r));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  sockets.splice(0).forEach((s) => s.ws.terminate());
  await handler.stop();
  await new Promise((r) => server.close(r));
});

test("updates from one client reach everyone in the room, with ack for the author", async () => {
  const dm = await connect("Dana", "dm");
  const player = await connect("Pat", "player");
  dm.send("join", { sheetId: "1" });
  player.send("join", { sheetId: "1" });
  await dm.next("sheet");
  await player.next("sheet");

  const presence = await dm.next("presence", (m) => m.data.participants.length === 2);
  assert.deepEqual(presence.data.participants.map((p) => p.name).sort(), ["Dana", "Pat"]);

  player.send("update", { sheetId: "1", patch: { inspiration: true }, seq: 1 });
  const seen = await dm.next("sheet", (m) => m.data.sheet.inspiration);
  assert.equal(seen.data.by?.name, "Pat");
  assert.deepEqual(seen.data.changed, ["inspiration"]);
  assert.equal(seen.data.ack, undefined);

  const own = await player.next("sheet", (m) => m.data.ack === 1);
  assert.equal(own.data.sheet.inspiration, true);
});

test("concurrent edits to different fields don't overwrite each other", async () => {
  const dm = await connect("Dana", "dm");
  const player = await connect("Pat", "player");
  dm.send("join", { sheetId: "1" });
  player.send("join", { sheetId: "1" });
  await dm.next("sheet");
  await player.next("sheet");

  dm.send("update", { sheetId: "1", patch: { conditions: ["Poisoned"] }, seq: 1 });
  player.send("update", { sheetId: "1", patch: { gp: 50 }, seq: 1 });
  await dm.next("sheet", (m) => m.data.ack === 1);
  await player.next("sheet", (m) => m.data.ack === 1);

  const sheet = await (await fetch(`${base}/api/sheets/1`)).json();
  assert.deepEqual(sheet.conditions, ["Poisoned"]);
  assert.equal(sheet.gp, 50);
});

test("DM damage applies server-side and temporary HP absorbs it", async () => {
  const dm = await connect("Dana", "dm");
  const player = await connect("Pat", "player");
  player.send("join", { sheetId: "3" });
  await player.next("sheet");
  player.send("update", { sheetId: "3", patch: { hitPoints: { temporary: 4 } }, seq: 1 });
  await player.next("sheet", (m) => m.data.ack === 1);

  // DM hasn't joined the sheet; damage from the party overview still works.
  dm.send("adjustHp", { sheetId: "3", amount: -10, seq: 7 });
  const ack = await dm.next("sheet", (m) => m.data.ack === 7);
  assert.deepEqual(ack.data.sheet.hitPoints, { current: 14, max: 31, temporary: 0 });
  const seen = await player.next("sheet", (m) => m.data.by?.role === "dm");
  assert.equal(seen.data.sheet.hitPoints.current, 14);
});

test("REST changes are pushed to live clients and list watchers", async () => {
  const player = await connect("Pat", "player");
  const dm = await connect("Dana", "dm");
  player.send("join", { sheetId: "2" });
  await player.next("sheet");
  dm.send("watchList", { watch: true });
  const initial = await dm.next("sheetList");
  assert.equal(initial.data.sheets.length, 3);

  await fetch(`${base}/api/sheets/2`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ armorClass: 19 }),
  });
  assert.equal((await player.next("sheet")).data.sheet.armorClass, 19);
  await dm.next("sheetList", (m) => m.data.sheets.some((s) => s.armorClass === 19));

  const created = await (
    await fetch(`${base}/api/sheets`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Newbie" }),
    })
  ).json();
  await dm.next("sheetList", (m) => m.data.sheets.some((s) => s.name === "Newbie"));

  await fetch(`${base}/api/sheets/2`, { method: "DELETE" });
  assert.equal((await player.next("deleted")).data.sheetId, "2");
  const after = await dm.next("sheetList", (m) => m.data.sheets.length === 3);
  assert.ok(after.data.sheets.some((s) => s.id === created.id));
});

test("invalid messages get an error, unknown sheets are rejected", async () => {
  const c = await connect("Pat", "player");
  c.ws.send("not json");
  assert.equal((await c.next("error")).data.message, "Invalid JSON");
  c.send("join", { sheetId: "nope" });
  assert.equal((await c.next("error")).data.sheetId, "nope");
  c.send("update", { sheetId: "1", patch: "x" });
  assert.match((await c.next("error")).data.message, /patch/);
});

test("presence updates when someone disconnects", async () => {
  const a = await connect("A", "dm");
  const b = await connect("B", "player");
  a.send("join", { sheetId: "1" });
  b.send("join", { sheetId: "1" });
  await a.next("presence", (m) => m.data.participants.length === 2);
  b.ws.close();
  await a.next("presence", (m) => m.data.participants.length === 1);
});
