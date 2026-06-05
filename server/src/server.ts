import { createServer } from "http";

import { memoryDb as db } from "./db.js";
import createApp from "./app.js";
import WebSocketHandler from "./websockethandler.js";
import { PORT } from "./utils/env.js";

const database = new db();
const app = createApp(database);
const server = createServer(app);

const websocketHandler = new WebSocketHandler(server, database);
websocketHandler.start();

server.listen(PORT, () => {
  console.log(`Server listening on port: ${PORT}`);
});
