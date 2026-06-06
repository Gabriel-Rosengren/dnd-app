import { useState, useCallback, useRef } from "react";
import type { CharacterData } from "@dnd/shared";

const WEBSOCKET_URL = "ws://2.67.6.132:8080";

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [character, setCharacter] = useState<CharacterData>();
  const wsRef = useRef<WebSocket | null>(null);
  const currentSheetIdRef = useRef<string | null>(null);

  const createWebsocket = useCallback(() => {
    if (wsRef.current !== null) return;

    const newSocket = new WebSocket(WEBSOCKET_URL);

    newSocket.addEventListener("open", () => {
      setConnected(true);
    });

    newSocket.addEventListener("message", (e) => {
      const data = JSON.parse(e.data);

      if (data.type === "data") {
        setCharacter({ ...data.data });
      }
    });

    wsRef.current = newSocket;
  }, []);

  const sendUpdate = useCallback(
    (data: CharacterData) => {
      setCharacter(data);

      wsRef.current?.send(
        JSON.stringify({
          type: "update",
          data: { sheetId: data.id, update: data },
        }),
      );
    },
    [],
  );

  const joinSheet = useCallback((sheetId: string) => {
    if (currentSheetIdRef.current && currentSheetIdRef.current !== sheetId) {
      wsRef.current?.send(
        JSON.stringify({ type: "leave", data: { sheetId: currentSheetIdRef.current } }),
      );
    }

    wsRef.current?.send(JSON.stringify({ type: "join", data: { sheetId } }));
    currentSheetIdRef.current = sheetId;
  }, []);

  return { connected, character, createWebsocket, joinSheet, sendUpdate };
}
