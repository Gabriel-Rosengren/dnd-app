import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const target = process.env.SERVER_URL ?? "http://localhost:8080";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ["@dnd/shared"],
  },
  ssr: {
    noExternal: ["@dnd/shared"],
  },
  server: {
    proxy: {
      "/api": target,
      "/ws": { target: target.replace(/^http/, "ws"), ws: true },
    },
  },
  preview: {
    proxy: {
      "/api": target,
      "/ws": { target: target.replace(/^http/, "ws"), ws: true },
    },
  },
});
