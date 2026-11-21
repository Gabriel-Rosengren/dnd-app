# dnd

Real-time collaborative D&D 5e character sheet manager.

I wanted a better way to run character sheets in my own campaigns — something where the DM and player can see the same sheet at the same time without passing a PDF back and forth.

## Features

- **Live sheets.** Every edit appears for everyone viewing the sheet as soon as it's made. Sections glow briefly when someone else changes them.
- **Presence and activity.** See who else has the sheet open (DM or player) and a feed of who changed what.
- **Full 5e sheet.** Abilities, saves, skills with proficiency/expertise, HP with temp HP and death saves, hit dice, conditions, attacks, spellcasting (DC/attack derived) with slot tracking, spells, class resources, coins and equipment, features, proficiencies, personality, notes and backstory.
- **Derived stats on the server.** Level, proficiency bonus, skill bonuses, passive perception and spell DC are recomputed on every change, so every client shows the same numbers.
- **Damage, healing and rests run on the server.** Temporary HP absorbs damage first, and two hits at once both land. Short and long rests restore the right resources.
- **DM party screen** (`/party`). Every character at a glance with live HP, AC, passive perception, initiative and conditions. Quick damage/heal, conditions and inspiration. Sort by name, initiative or lowest HP.
- **Works on a flaky connection.** The client reconnects on its own, re-joins rooms and re-sends any unconfirmed edits.
- **Saves to disk.** Sheets are saved to `server/data/sheets.json` and survive restarts.

## How it works

- **TypeScript/Node.js** server (Express + `ws`). REST and WebSocket both go through one `SheetStore` that emits change events, so a change from either is broadcast to every connected client.
- Clients send **partial patches** (`{ hitPoints: { current: 12 } }`) instead of whole sheets. Objects merge deeply and arrays replace. That way the DM editing HP and the player editing gold at the same moment don't overwrite each other.
- Edits are **optimistic**. The UI applies them at once and reconciles when the server acknowledges them by sequence number, so typing never jumps back.
- A ping/pong heartbeat cleans up dead connections every 30s.
- **React** frontend built with Vite. A single shared `SyncClient` (`frontend/src/lib/sync.ts`) feeds React through `useSyncExternalStore`.
- `packages/shared` holds the `Character` model, protocol types, validation and the rules helpers (modifiers, derived stats, HP changes, rests) used by both sides.

## Getting started

### Run both server and client (recommended)

```sh
npm install
npm run dev
```

Open `http://localhost:7777`. The Vite dev server proxies `/api` and `/ws` to the backend on port 8080, so other devices on your network can open `http://<your-ip>:7777` too. Pick a name and choose Player or Dungeon Master, then open a character. The DM can keep `/party` open during play.

### Configuration

| Variable | Where | Default | Description |
|---|---|---|---|
| `PORT` | server | `8080` | HTTP + WebSocket port |
| `DATA_FILE` | server | `server/data/sheets.json` | Where sheets are saved. `:memory:` disables saving |
| `SERVER_URL` | frontend dev | `http://localhost:8080` | Backend the Vite proxy forwards to |
| `VITE_API_URL` / `VITE_WS_URL` | frontend build | same origin | Point a built frontend at a server elsewhere |

### Scripts

```sh
npm run dev     # server + client with reload
npm test        # server tests: shared rules + real-time integration
npm run lint    # frontend lint
npm run build   # typecheck server, build frontend
npm start -w server
```

## Message protocol

See [`server/API.md`](server/API.md) for the full REST and WebSocket reference.

| Client → server | Data | Description |
|---|---|---|
| `hello` | `{ name, role }` | Identify yourself (`role`: `dm` \| `player`) |
| `join` / `leave` | `{ sheetId }` | Subscribe / unsubscribe to a sheet |
| `update` | `{ sheetId, patch, seq? }` | Merge a partial update |
| `adjustHp` | `{ sheetId, amount, seq? }` | Heal (+) or damage (−) |
| `rest` | `{ sheetId, kind, seq? }` | `short` or `long` rest |
| `watchList` | `{ watch }` | Receive live summaries of every sheet |

| Server → client | Data |
|---|---|
| `welcome` | `{ you }` |
| `sheet` | `{ sheet, by?, changed?, ack? }` |
| `presence` | `{ sheetId, participants }` |
| `sheetList` | `{ sheets }` |
| `deleted` | `{ sheetId }` |
| `error` | `{ message, sheetId?, ack? }` |

## Not yet

- No accounts or permissions yet. Anyone who can reach the server can edit any sheet, which is fine for a home game on a LAN. Campaign scoping and DM-only fields would be the next step.
- Two people editing the *same* text field at once is last-write-wins.
