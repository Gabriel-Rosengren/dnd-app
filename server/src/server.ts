import WebSocketHandler from "./websockethandler.js";

const PORT = 8080;

const websocketHandler = new WebSocketHandler(PORT);
websocketHandler.start();
