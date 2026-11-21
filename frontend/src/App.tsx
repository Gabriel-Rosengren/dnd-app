import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HomePage } from "./routes/HomePage";
import { SheetPage } from "./routes/SheetPage";
import { PartyPage } from "./routes/PartyPage";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="sheets/:sheetId" element={<SheetPage />} />
        <Route path="party" element={<PartyPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
