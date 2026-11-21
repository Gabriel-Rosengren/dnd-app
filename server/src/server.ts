import { createServer } from "http";

import { JsonFilePersistence, MemoryPersistence, SEED_SHEETS, SheetStore } from "./db.js";
import createApp from "./app.js";
import WebSocketHandler from "./websockethandler.js";
import { DATA_FILE, PORT } from "./utils/env.js";

const persistence =
  DATA_FILE === ":memory:" ? new MemoryPersistence(SEED_SHEETS) : new JsonFilePersistence(DATA_FILE);
const store = new SheetStore(persistence);
const app = createApp(store);
const server = createServer(app);

const websocketHandler = new WebSocketHandler(server, store);
websocketHandler.start();

server.listen(PORT, () => {
  console.log(`Server listening on port: ${PORT}`);
  if (DATA_FILE !== ":memory:") console.log(`Saving sheets to ${DATA_FILE}`);
});

async function shutdown() {
  store.flush();
  await websocketHandler.stop();
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
