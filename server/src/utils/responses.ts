import { Request, Response } from "express";

export function sendErrorResponse(
  req: Request,
  res: Response,
  code: number,
  message: string,
) {
  res.status(code).json({ error: message });
}

export function sendDataResponse(
  req: Request,
  res: Response,
  code: number,
  data: Object,
) {
  res.status(code).json({ data });
}
