import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Import ui-shared styles (includes fonts and reset)
import "ui-shared/styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
