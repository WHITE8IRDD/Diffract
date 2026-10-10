import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

/**
 * Diffract entry point.
 *
 * Pixi initializes its renderer asynchronously. Do not StrictMode-remount it
 * mid-initialization in development; that can leave the first canvas unusable.
 */
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <App />,
);
