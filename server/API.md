# API Documentation

Base URL: `http://localhost:8080` (in development the frontend proxies `/api` and `/ws`).

All REST changes are broadcast to WebSocket clients viewing the affected sheet.

---

## REST — Sheets

### List sheets

```
GET /api/sheets          → SheetSummary[]
GET /api/sheets?full=1   → Character[]
```

`SheetSummary`:

```ts
{ id, name, playerName, race, classLabel, level, hitPoints, armorClass, passivePerception,
  initiative, speed, inspiration, conditions, deathSaves, spellSaveDC?, updatedAt }
```

### Create a sheet

```
POST /api/sheets
```

Body: optional partial `Character`. Missing fields get defaults and the server assigns the `id`.

**`201`**: the new `Character`.

### Get a sheet

```
GET /api/sheets/:id
```

**`200`**: `Character` · **`404`**: `{ "error": "Sheet not found" }`

### Patch a sheet

```
PATCH /api/sheets/:id
```

Body: partial `Character`. Objects are merged deeply and arrays replace. `id` is ignored.

```json
{ "hitPoints": { "current": 18 }, "conditions": ["Poisoned"] }
```

**`200`**: the updated `Character` · **`400`** body not an object · **`404`**

### Replace a sheet

```
PUT /api/sheets/:id
```

Body: a full `Character`. Missing fields reset to defaults.

**`200`**: `Character` · **`400`** · **`404`**

### Delete a sheet

```
DELETE /api/sheets/:id
```

**`204`** · **`404`**

### Health

```
GET /api/health → { "ok": true }
```

---

## WebSocket — Real-time sync

Connect to `ws://localhost:8080` (any path, e.g. `/ws`). Every message is `{ "type": string, "data": object }`.

Unknown or malformed messages get an `error` reply.

### On connect

The server sends `welcome`. The identity defaults to `Anonymous` / `player`.

```json
{ "type": "welcome", "data": { "you": { "id": "a1b2c3d4", "name": "Anonymous", "role": "player" } } }
```

### `hello`: identify

```json
{ "type": "hello", "data": { "name": "Dana", "role": "dm" } }
```

The reply is `welcome`. Presence is re-broadcast to every room you're in.

### `join` / `leave`

```json
{ "type": "join", "data": { "sheetId": "1" } }
```

The reply is a `sheet` snapshot (no `by`). A `presence` message then goes to everyone in the room. Unknown sheets get `error` with the `sheetId`.

`leave` has no reply; the server sends updated `presence` to the room.

### `update`: merge a partial update

```json
{ "type": "update", "data": { "sheetId": "1", "patch": { "hitPoints": { "current": 18 } }, "seq": 42 } }
```

Every client in the room receives:

```json
{ "type": "sheet", "data": {
  "sheet": { "...full Character..." },
  "by": { "id": "a1b2c3d4", "name": "Pat", "role": "player" },
  "changed": ["hitPoints"]
} }
```

The author's copy also includes `"ack": 42`. Clients use it to drop confirmed optimistic edits. Authors who haven't joined the room (e.g. the DM party screen) still get their ack.

### `adjustHp`: damage or heal

```json
{ "type": "adjustHp", "data": { "sheetId": "1", "amount": -7, "seq": 43 } }
```

Negative amounts deal damage and temporary HP absorbs it first. Positive amounts heal up to max; healing from 0 resets death saves. The result is broadcast as a `sheet` message.

### `rest`

```json
{ "type": "rest", "data": { "sheetId": "1", "kind": "long", "seq": 44 } }
```

- **Short rest:** restores `shortRest` resources.
- **Long rest:** also restores HP, clears temp HP and death saves, restores spell slots and `longRest` resources, and recovers half your hit dice.

### `watchList`: live sheet list

```json
{ "type": "watchList", "data": { "watch": true } }
```

The server replies with `sheetList`, then sends it again whenever a summary changes (create, delete, or an edit to a summarised field).

```json
{ "type": "sheetList", "data": { "sheets": [ "...SheetSummary..." ] } }
```

### Other server messages

```json
{ "type": "presence", "data": { "sheetId": "1", "participants": [{ "id": "…", "name": "Dana", "role": "dm" }] } }
{ "type": "deleted",  "data": { "sheetId": "1" } }
{ "type": "error",    "data": { "message": "Sheet not found", "sheetId": "1", "ack": 43 } }
```

---

## Data model — `Character`

See [`packages/shared/src/types.ts`](../packages/shared/src/types.ts) for the full type.

Fields marked *derived* are recomputed by the server on every change, and any value a client sends for them is overwritten:

- `level`: sum of class levels
- `proficiencyBonus`
- `skills`: total bonus per skill
- `passivePerception`
- `maxHitDice`
- `spellSaveDC` and `spellAttackBonus`, when `spellcastingAbility` is set

Values with the wrong type (e.g. `"armorClass": "high"`) are dropped rather than stored.
