import { useState, useEffect } from "react";

function App() {
  const [character, setCharacter] = useState<CharacterData>();
  const [hitpoints, setHitPoints] = useState();
  const [name, setName] = useState();

  const [connected, setConnected] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [currentSheetId, setCurrentSheetId] = useState<string | null>(null);

  const websocket_url = "ws://localhost:8080";

  type CharacterData = {
    id: string;
    name: string;
    hitPoints: {
      current: number;
    };
  };

  const createWebsocket = () => {
    if (ws !== null) {
      return;
    }

    const newSocket = new WebSocket(websocket_url);

    newSocket.addEventListener("open", () => {
      setConnected(true);
      console.log("Connection sucessful!");
    });

    newSocket.addEventListener("message", (e) => {
      const data = JSON.parse(e.data);

      if (data.type === "data") {
        const charData = data.data;
        setCharacter({ ...charData });
      }

      console.log(data);
    });

    setWs(newSocket);
  };

  const sendUpdate = (data: any) => {
    ws?.send(
      JSON.stringify({
        type: "update",
        data: { sheetId: character?.id, data },
      }),
    );
  };

  const handleClick = (e: any) => {
    e.preventDefault();
    createWebsocket();
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();

    const value: number = e.target.hitpoints.value;
    const newChar = { ...character };

    (newChar.hitPoints as any).current = value;
    e.target.hitpoints.value = "";
    e.target.hitpoints.placeholder = value;
    sendUpdate(newChar);
  };

  const getSheet = (sheetId: string) => {
    if (currentSheetId && currentSheetId !== sheetId) {
      ws?.send(
        JSON.stringify({ type: "leave", data: { sheetId: currentSheetId } }),
      );
    }

    ws?.send(JSON.stringify({ type: "join", data: { sheetId } }));
    setCurrentSheetId(sheetId);
  };

  return (
    <>
      <button onClick={handleClick}>Connect!</button>
      <button
        onClick={() => {
          getSheet("1");
        }}
      >
        Tink
      </button>
      <button
        onClick={() => {
          getSheet("2");
        }}
      >
        Formik
      </button>
      <p>Connected: {`${connected}`}</p>

      {character ? (
        <>
          <p>{character.name}</p>
          <form onSubmit={handleSubmit}>
            <input
              placeholder={`${character.hitPoints.current}`}
              name="hitpoints"
            ></input>
            <button type="submit">Confirm</button>
          </form>

          <p>{character.hitPoints.current}</p>
        </>
      ) : (
        <></>
      )}
    </>
  );
}

export default App;
