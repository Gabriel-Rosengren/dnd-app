import { Router } from "express";
import { sendErrorResponse } from "../utils/responses.js";

export const sheetRouter = Router();
sheetRouter.get("/api/sheets", (req: any, res) => {
  res.json(req.db.getAll());
});

sheetRouter.get("/api/sheets/:id", (req: any, res) => {
  const sheet = req.db.get(req.params.id);
  if (sheet === false) {
    sendErrorResponse(req, res, 404, "Sheet Not Found");
    return;
  }
  res.json(sheet);
});

sheetRouter.post("/api/sheets/:id", (req: any, res) => {
  const result = req.db.update(req.params.id, req.body);
  if (result === false) {
    sendErrorResponse(req, res, 404, "Sheet Not Found");
    return;
  }
  res.json(result);
});

sheetRouter.delete("/api/sheets/:id", (req: any, res) => {
  const deleted = req.db.deleted(req.params.id);
  if (deleted === false) {
    sendErrorResponse(req, res, 404, "Sheet Not Found");
    return;
  }
  res.status(204).send();
});
