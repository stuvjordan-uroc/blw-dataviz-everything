import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import SessionPage from "./pages/SessionPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/polls/:slug" element={<SessionPage />} />
          <Route
            path="/"
            element={
              <div style={{ padding: "2rem", textAlign: "center" }}>
                <h1>BLW Dataviz Polls</h1>
                <p>Please use the session link provided by your facilitator.</p>
              </div>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
