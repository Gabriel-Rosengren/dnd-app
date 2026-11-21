/**
 * In development Vite proxies /api and /ws to the server (see vite.config.ts),
 * so the app works from any device on the LAN without hardcoding an IP.
 * Set VITE_API_URL / VITE_WS_URL to point at a server elsewhere.
 */
const env = import.meta.env;

export const API_URL: string = env.VITE_API_URL ?? "";

export const WS_URL: string =
  env.VITE_WS_URL ??
  `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`;
