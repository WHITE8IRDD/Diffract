import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

/**
 * Diffract entry point.
 *
 * StrictMode is enabled for development-time checks; Tauri production builds
 * strip the double-invocation behaviour via the React production runtime.
 */
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
