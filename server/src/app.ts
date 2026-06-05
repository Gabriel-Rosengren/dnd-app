import express from "express";
import cors from "cors";
import type { Database } from "./db.js";
import { sendErrorResponse } from "./utils/responses.js";

import { sheetRouter } from "./routes/sheets.js";

export default function createApp(database: Database) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Patchwork solution for passing db connection down to routers
  app.use((req: any, res, next) => {
    req.db = database;

    next();
  });

  app.use(sheetRouter);

  app.use((req, res) => {
    sendErrorResponse(req, res, 404, "Sheet Not Found");
  });

  return app;
}
