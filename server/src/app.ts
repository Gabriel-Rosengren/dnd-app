import express from "express";
import cors from "cors";
import type { SheetStore } from "./db.js";
import { sendErrorResponse } from "./utils/responses.js";
import { createSheetRouter } from "./routes/sheets.js";

export default function createApp(store: SheetStore) {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use(createSheetRouter(store));

  app.use((req, res) => {
    sendErrorResponse(req, res, 404, "Not found");
  });

  return app;
}
