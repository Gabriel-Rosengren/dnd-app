import { fileURLToPath } from "url";

export const PORT = Number(process.env.PORT) || 8080;

/** JSON file sheets are saved to. Set DATA_FILE=":memory:" to disable persistence. */
export const DATA_FILE =
  process.env.DATA_FILE || fileURLToPath(new URL("../../data/sheets.json", import.meta.url));
