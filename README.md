# dnd

Real-time collaborative D&D 5e character sheet manager.

I wanted a better way to run character sheets in my own campaigns — something where the DM and player can see the same sheet at the same time without passing a PDF back and forth.

## How it works

- **TypeScript/Node.js** server with a WebSocket-based real-time sync layer
- Players and DMs connect to a room identified by sheet ID; any update is broadcast to everyone else in that room
- Ping/pong heartbeat cleans up dead connections every 60s
- A fully typed `Character` model covers stats, skills, spells, equipment, notes, and class resources

## Getting started

```sh
cd server
npm install
npm run dev
```

Connects on `ws://localhost:8080`. No client yet — use a WebSocket testing tool or build one against the message protocol.

## Message protocol

| Type | Data | Description |
|------|------|-------------|
| `join` | `{ sheetId }` | Subscribe to a sheet's room |
| `leave` | `{ sheetId }` | Unsubscribe |
| `update` | `{ sheetId, update }` | Send changes; server saves and relays to room |
