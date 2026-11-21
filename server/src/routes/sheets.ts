import { Router } from "express";
import { summarize } from "@dnd/shared";
import type { SheetStore } from "../db.js";
import { sendErrorResponse } from "../utils/responses.js";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createSheetRouter(store: SheetStore) {
  const router = Router();

  /** Summaries by default; `?full=1` returns complete sheets. */
  router.get("/api/sheets", (req, res) => {
    const sheets = store.list();
    res.json(req.query.full ? sheets : sheets.map(summarize));
  });

  router.post("/api/sheets", (req, res) => {
    const body = isObject(req.body) ? req.body : {};
    res.status(201).json(store.create(body));
  });

  router.get("/api/sheets/:id", (req, res) => {
    const sheet = store.get(req.params.id);
    if (!sheet) return sendErrorResponse(req, res, 404, "Sheet not found");
    res.json(sheet);
  });

  /** Replace the whole sheet. */
  router.put("/api/sheets/:id", (req, res) => {
    if (!isObject(req.body)) return sendErrorResponse(req, res, 400, "Body must be an object");
    const sheet = store.replace(req.params.id, req.body);
    if (!sheet) return sendErrorResponse(req, res, 404, "Sheet not found");
    res.json(sheet);
  });

  /** Merge a partial update into the sheet. */
  router.patch("/api/sheets/:id", (req, res) => {
    if (!isObject(req.body)) return sendErrorResponse(req, res, 400, "Body must be an object");
    const sheet = store.patch(req.params.id, req.body);
    if (!sheet) return sendErrorResponse(req, res, 404, "Sheet not found");
    res.json(sheet);
  });

  router.delete("/api/sheets/:id", (req, res) => {
    if (!store.delete(req.params.id)) return sendErrorResponse(req, res, 404, "Sheet not found");
    res.status(204).send();
  });

  return router;
}
