import express from "express";
import cors from "cors";
import type { Database } from "./db.js";

export default function createApp(database: Database) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/api/sheets", (_req, res) => {
    res.json(database.getAll());
  });

  app.get("/api/sheets/:id", (req, res) => {
    const sheet = database.get(req.params.id);
    if (sheet === false) {
      res.status(404).json({ error: "Sheet not found" });
      return;
    }
    res.json(sheet);
  });

  app.post("/api/sheets/:id", (req, res) => {
    const result = database.update(req.params.id, req.body);
    if (result === false) {
      res.status(404).json({ error: "Sheet not found" });
      return;
    }
    res.json(result);
  });

  app.delete("/api/sheets/:id", (req, res) => {
    const deleted = database.deleted(req.params.id);
    if (deleted === false) {
      res.status(404).json({ error: "Sheet not found" });
      return;
    }
    res.status(204).send();
  });

  app.use((_req, res) => {
    res.status(404).send("Not Found");
  });

  return app;
}
