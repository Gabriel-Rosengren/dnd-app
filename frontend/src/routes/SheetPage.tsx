import { useState, useEffect, useCallback } from "react";
import { useWebSocket } from "../hooks/useWebSocket.js";
import { ConnectionStatus } from "../components/ConnectionStatus.js";
import { SheetSelector } from "../components/SheetSelector.js";
import { SheetView } from "../components/SheetView.js";

export function SheetPage() {
  const { connected, character, createWebsocket, joinSheet, sendUpdate } =
    useWebSocket();

  const [draft, setDraft] = useState("");

  useEffect(() => {
    setDraft(String(character?.hitPoints.current ?? ""));
  }, [character?.id]);

  const save = useCallback(() => {
    const value = Number(draft);
    if (!character || value === character.hitPoints.current) return;

    sendUpdate({
      ...character,
      hitPoints: { ...character.hitPoints, current: value },
    });
  }, [draft, character, sendUpdate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft(e.target.value);
    const value = Number(e.target.value);
    if (!character || value === character.hitPoints.current) return;

    sendUpdate({
      ...character,
      hitPoints: { ...character.hitPoints, current: value },
    });
  };

  const handleBlur = () => {
    save();
  };

  return (
    <>
      <button onClick={createWebsocket}>Connect!</button>
      <SheetSelector onSelect={joinSheet} />
      <ConnectionStatus connected={connected} />

      {character ? (
        <>
          <SheetView character={character} />
          <input value={draft} onChange={handleChange} onBlur={handleBlur} />
        </>
      ) : null}
    </>
  );
}
