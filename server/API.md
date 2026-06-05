# API Documentation

Base URL: `http://localhost:8080`

---

## REST — Sheets

All CRUD operations for character sheets.

### List all sheets

```
GET /api/sheets
```

**Response `200`**
```json
[
  { "id": "1", "name": "Tink Fiddleton", "hitPoints": { "current": 20 } },
  { "id": "2", "name": "Formik 'Spores' Doeger Rowynn Piddock Yddae", "hitPoints": { "current": 20 } }
]
```

---

### Get a sheet

```
GET /api/sheets/:id
```

**Response `200`**
```json
{ "id": "1", "name": "Tink Fiddleton", "hitPoints": { "current": 20 } }
```

**Response `404`**
```json
{ "error": "Sheet not found" }
```

---

### Upsert a sheet

Replaces the entire sheet at `:id` with the request body.

```
POST /api/sheets/:id
```

**Request body** — full or partial `Character` object
```json
{ "name": "Tink Fiddleton", "hitPoints": { "current": 18 } }
```

**Response `200`** — the saved object as returned by the database
```json
{ "id": "1", "name": "Tink Fiddleton", "hitPoints": { "current": 18 } }
```

**Response `404`**
```json
{ "error": "Sheet not found" }
```

---

### Delete a sheet

```
DELETE /api/sheets/:id
```

**Response `204`** — no body

**Response `404`**
```json
{ "error": "Sheet not found" }
```

---

### Catch-all

Any unmatched route returns:

**Response `404`**
```
Not Found
```

---

## WebSocket — Real-time sync

Connect to the WebSocket server at `ws://localhost:8080`.

All messages follow the shape:

```ts
{ "type": string, "data": object }
```

---

### Join a sheet room

Subscribe to receive updates for a specific sheet.

```json
{ "type": "join", "data": { "sheetId": "1" } }
```

**Reply `data`** — the full current sheet state
```json
{ "type": "data", "data": { "id": "1", "name": "Tink Fiddleton", "hitPoints": { "current": 20 } } }
```

---

### Leave a sheet room

Unsubscribe from a sheet room.

```json
{ "type": "leave", "data": { "sheetId": "1" } }
```

No reply.

---

### Update a sheet

Send changes to the server. The server persists the update and broadcasts it to all other clients in the room.

```json
{ "type": "update", "data": { "sheetId": "1", "update": { "id": "1", "name": "Tink Fiddleton", "hitPoints": { "current": 18 } } } }
```

**Broadcast to room** — sent to all other clients in the room
```json
{ "type": "data", "data": { "id": "1", "name": "Tink Fiddleton", "hitPoints": { "current": 18 } } }
```

**Reply to sender**
```json
{ "type": "info", "data": { "message": "Ok" } }
```

---

### Error

```json
{ "type": "error", "data": { "message": "Invalid JSON" } }
```

---

## Data model — `Character`

```ts
{
  id: string;
  name: string;
  playerName: string;
  classes: Array<{ name: string; level: number; subclass?: string }>;
  level: number;
  background: string;
  race: string;
  subrace?: string;
  alignment: string;
  experiencePoints: number;
  inspiration: boolean;

  abilityScores: Record<"STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA", number>;
  proficiencyBonus: number;
  savingThrows: Record<"STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA", boolean>;

  skills: Record<SkillName, number>;
  skillProficiencies: Partial<Record<SkillName, "proficient" | "expertise" | "none">>;
  passivePerception: number;

  hitPoints: { current: number; max: number; temporary: number };
  hitDice: string;
  currentHitDice: number;
  maxHitDice: number;
  deathSaves: { successes: number; failures: number };

  armorClass: number;
  initiative: number;
  speed: number;
  attacks: Array<{ name: string; attackBonus: number; damage: string; damageType: string; notes?: string }>;

  spellcastingAbility?: string;
  spellSaveDC?: number;
  spellAttackBonus?: number;
  spellSlots: Record<number, { total: number; used: number }>;
  spells: Array<{ name: string; level: number; prepared: boolean; school?: string; components?: string; concentration?: boolean; ritual?: boolean }>;

  cp: number; sp: number; ep: number; gp: number; pp: number;
  equipment: Array<{ name: string; quantity: number; notes?: string }>;

  personalityTraits: string;
  ideals: string;
  bonds: string;
  flaws: string;
  classResources: Array<{ name: string; current: number; max: number; renewal: "shortRest" | "longRest" | "dawn" | "special" }>;
  features: Array<{ name: string; description: string; source?: string }>;
  feats: Array<string>;

  languages: Array<string>;
  armorProficiencies: Array<string>;
  weaponProficiencies: Array<string>;
  toolProficiencies: Array<string>;

  age: number;
  height: string;
  weight: string;
  eyes: string;
  skin: string;
  hair: string;

  backstory: string;
  allies: Array<{ name: string; description: string }>;
  treasure: string;

  campaigns: Array<string>;
  notes: Array<{ id: string; type: "character" | "world"; title: string; content: string; tags: Array<string>; createdAt: string; updatedAt: string }>;
}
```
