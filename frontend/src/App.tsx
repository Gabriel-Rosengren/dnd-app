import { Routes, Route } from "react-router-dom";
import { SheetPage } from "./routes/SheetPage.js";

function App() {
  return (
    <Routes>
      <Route path="/" element={<SheetPage />} />
    </Routes>
  );
}

export default App;
