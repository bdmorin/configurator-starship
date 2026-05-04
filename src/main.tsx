import { createRoot } from "react-dom/client";
import { App } from "./App";
import "@xterm/xterm/css/xterm.css";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("no #root");
// StrictMode intentionally double-mounts effects in dev; xterm.js 5.x is not
// StrictMode-safe and throws `reading 'dimensions'` when its Viewport syncs
// after the first (discarded) mount. Skip it — this is a personal tool.
createRoot(root).render(<App />);
