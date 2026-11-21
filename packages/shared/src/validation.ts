import type { ClientMessage, Role } from "./types.js";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const MAX_NAME_LENGTH = 40;
const ROLES: Array<Role> = ["dm", "player"];

function isSeq(value: unknown) {
  return value === undefined || (typeof value === "number" && Number.isInteger(value));
}

/** Validate an incoming WebSocket message. Returns the message, or an error string. */
export function parseClientMessage(raw: unknown): ClientMessage | string {
  if (!isObject(raw) || typeof raw.type !== "string") return "Message must be { type, data }";
  const data = raw.data;
  if (!isObject(data)) return "Message data must be an object";

  const needsSheet = ["join", "leave", "update", "adjustHp", "rest"];
  if (needsSheet.includes(raw.type) && (typeof data.sheetId !== "string" || !data.sheetId)) {
    return "sheetId must be a non-empty string";
  }
  if (!isSeq(data.seq)) return "seq must be an integer";

  switch (raw.type) {
    case "hello": {
      if (typeof data.name !== "string" || !data.name.trim()) return "name is required";
      if (!ROLES.includes(data.role as Role)) return "role must be 'dm' or 'player'";
      return {
        type: "hello",
        data: { name: data.name.trim().slice(0, MAX_NAME_LENGTH), role: data.role as Role },
      };
    }
    case "join":
    case "leave":
      return { type: raw.type, data: { sheetId: data.sheetId as string } };
    case "update": {
      if (!isObject(data.patch)) return "patch must be an object";
      const { id: _ignored, ...patch } = data.patch;
      void _ignored;
      return {
        type: "update",
        data: { sheetId: data.sheetId as string, patch, seq: data.seq as number | undefined },
      };
    }
    case "adjustHp":
      if (typeof data.amount !== "number" || !Number.isFinite(data.amount)) {
        return "amount must be a number";
      }
      return {
        type: "adjustHp",
        data: {
          sheetId: data.sheetId as string,
          amount: Math.trunc(data.amount),
          seq: data.seq as number | undefined,
        },
      };
    case "rest":
      if (data.kind !== "short" && data.kind !== "long") return "kind must be 'short' or 'long'";
      return {
        type: "rest",
        data: { sheetId: data.sheetId as string, kind: data.kind, seq: data.seq as number | undefined },
      };
    case "watchList":
      return { type: "watchList", data: { watch: data.watch !== false } };
    default:
      return `Unknown message type: ${raw.type}`;
  }
}
